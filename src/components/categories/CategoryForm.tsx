"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { TipTapEditor } from "@/components/common/TipTapEditor";
import { fetchCategories, uploadCategoryImage } from "@/features/categories/api";
import { fetchProductGroups } from "@/features/product-groups/api";
import type { Category } from "@/features/categories/types";
import type { ProductGroup } from "@/features/product-groups/types";
import { collapseMediaUrls } from "@/lib/media";
import { buildImageUrl } from "@/lib/utils";

// Display type options
const DISPLAY_TYPES = [
  { value: 0, label: "Mặc định" },
  { value: 1, label: "Chi tiết" },
  { value: 2, label: "Danh sách" },
];

// Validation schema
const categoryFormSchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  nameEn: z.string().optional(),
  content: z.string().optional(),
  contentEn: z.string().optional(),
  image: z.string().optional(),
  groupId: z.number().min(1, "Vui lòng chọn nhóm"),
  parentId: z.number(),
  sortOrder: z.number().min(-1, "Thứ tự phải >= -1"),
  displayType: z.number().optional(),
  status: z.number().optional(),
  priceToPoint: z.number().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// Tree node type for category tree
type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
  level: number;
};

// Build tree structure from flat list
function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [], level: 0 });
  });

  // Build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parentId === 0) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parentId);
      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    }
  });

  // Sort by sortOrder
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

// Flatten tree to array with level info for display
function flattenTree(nodes: CategoryTreeNode[], result: CategoryTreeNode[] = []): CategoryTreeNode[] {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children.length > 0) {
      flattenTree(node.children, result);
    }
  });
  return result;
}

type CategoryFormProps = {
  defaultValues?: Partial<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  isEdit?: boolean;
};

export function CategoryForm({ defaultValues, onSubmit, isEdit = false }: CategoryFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    defaultValues?.image ? buildImageUrl(defaultValues.image) : null
  );
  const [uploading, setUploading] = useState(false);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      nameEn: defaultValues?.nameEn ?? "",
      content: defaultValues?.content ?? "",
      contentEn: defaultValues?.contentEn ?? "",
      image: defaultValues?.image ?? "",
      groupId: defaultValues?.groupId ?? 0,
      parentId: defaultValues?.parentId ?? 0,
      sortOrder: defaultValues?.sortOrder ?? 1,
      displayType: defaultValues?.displayType ?? 0,
      status: defaultValues?.status ?? 0,
      priceToPoint: defaultValues?.priceToPoint ?? 0,
    },
  });

  const selectedGroupId = watch("groupId");

  // Flatten tree for dropdown display
  const flatCategories = flattenTree(categoryTree);

  // Load groups only on mount
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupsData = await fetchProductGroups({ page: 1, pageSize: 200 });
        setGroups(Array.isArray(groupsData.items) ? groupsData.items : []);
      } catch (err) {
        console.error("Failed to load groups:", err);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
  }, []);

  // Load categories when group changes
  useEffect(() => {
    if (!selectedGroupId || selectedGroupId === 0) {
      setCategoryTree([]);
      return;
    }

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const categoriesData = await fetchCategories({
          Page: 1,
          PageSize: 9999,
          GroupId: selectedGroupId,
        });
        const items = Array.isArray(categoriesData.items) ? categoriesData.items : [];
        const tree = buildCategoryTree(items);
        setCategoryTree(tree);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setCategoryTree([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, [selectedGroupId]);

  // Reset parentId when group changes (except on initial load with defaultValues)
  const prevGroupId = useRef(defaultValues?.groupId);
  useEffect(() => {
    if (prevGroupId.current !== undefined && prevGroupId.current !== selectedGroupId) {
      setValue("parentId", 0);
    }
    prevGroupId.current = selectedGroupId;
  }, [selectedGroupId, setValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Tối đa 5MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      setValue("image", url);
      setImagePreview(buildImageUrl(url));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload hình ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setValue("image", "");
    setImagePreview(null);
  };

  const processSubmit = async (values: CategoryFormValues) => {
    const processedValues: CategoryFormValues = {
      ...values,
      content: values.content ? collapseMediaUrls(values.content) : "",
      contentEn: values.contentEn ? collapseMediaUrls(values.contentEn) : "",
    };
    await onSubmit(processedValues);
  };

  if (loadingGroups) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit(processSubmit)}>
      {/* Basic Info Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vietnamese Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập tên danh mục"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          {/* English Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="nameEn">
              Tên tiếng Anh
            </label>
            <input
              id="nameEn"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Enter category name"
              {...register("nameEn")}
            />
          </div>

          {/* Group */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="groupId">
              Nhóm <span className="text-rose-500">*</span>
            </label>
            <select
              id="groupId"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              {...register("groupId", { valueAsNumber: true })}
            >
              <option value={0}>-- Chọn nhóm --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {errors.groupId && <p className="text-xs text-rose-600">{errors.groupId.message}</p>}
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="parentId">
              Danh mục cha
            </label>
            <div className="relative">
              <select
                id="parentId"
                disabled={!selectedGroupId || selectedGroupId === 0 || loadingCategories}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                {...register("parentId", { valueAsNumber: true })}
              >
                <option value={0}>
                  {!selectedGroupId || selectedGroupId === 0
                    ? "-- Vui lòng chọn nhóm trước --"
                    : loadingCategories
                      ? "Đang tải..."
                      : "Danh mục gốc"}
                </option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.level > 0 ? `${"—".repeat(c.level)} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              {loadingCategories && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
            {!selectedGroupId || selectedGroupId === 0 ? (
              <p className="text-xs text-slate-500">Chọn nhóm để hiển thị danh mục cha</p>
            ) : null}
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="sortOrder">
              Thứ tự sắp xếp
            </label>
            <input
              id="sortOrder"
              type="number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="-1"
              {...register("sortOrder", { valueAsNumber: true })}
            />
            {errors.sortOrder && <p className="text-xs text-rose-600">{errors.sortOrder.message}</p>}
          </div>

          {/* Display Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="displayType">
              Cách hiển thị
            </label>
            <select
              id="displayType"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              {...register("displayType", { valueAsNumber: true })}
            >
              {DISPLAY_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Trạng thái</label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={field.value === 0}
                      onChange={() => field.onChange(0)}
                      className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={field.value === 1}
                      onChange={() => field.onChange(1)}
                      className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Ẩn</span>
                  </label>
                </div>
              )}
            />
          </div>

          {/* Price to Point */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="priceToPoint">
              Giá / Điểm
            </label>
            <input
              id="priceToPoint"
              type="number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0"
              {...register("priceToPoint", { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Hình ảnh</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="flex items-start gap-6">
          <div className="relative h-40 w-60 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                  title="Xóa hình ảnh"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                <svg className="mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span className="text-sm">Chưa có hình ảnh</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang tải...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Chọn hình ảnh
                </>
              )}
            </button>
            <p className="text-xs text-slate-500">PNG, JPG, WEBP. Tối đa 5MB</p>
          </div>
        </div>
      </div>

      {/* Content Section - Vietnamese */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Mô tả (Tiếng Việt)</h2>

        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <TipTapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Nhập mô tả danh mục..."
              uploadModule="categories"
            />
          )}
        />
      </div>

      {/* Content Section - English */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Mô tả (Tiếng Anh)</h2>

        <Controller
          control={control}
          name="contentEn"
          render={({ field }) => (
            <TipTapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Enter category description..."
              uploadModule="categories"
            />
          )}
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo danh mục"}
        </button>
      </div>
    </form>
  );
}
