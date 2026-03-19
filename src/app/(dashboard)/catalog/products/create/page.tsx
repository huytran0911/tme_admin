"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { RichTextEditor } from "@/components/shared";
import {
  createProduct,
  uploadImage,
  fetchGroups,
  fetchAllCategories,
  fetchViewData,
  type ViewDataItem,
} from "@/features/products/api";
import { createProductVariant } from "@/features/product-variants/api";
import { fetchSuppliers } from "@/features/suppliers/api";
import type { Supplier } from "@/features/suppliers/types";
import type {
  UpdateProductRequest,
  Group,
  Category,
} from "@/features/products/types";
import { buildImageUrl } from "@/lib/utils";

// ========== Shared types & helpers (same as edit page) ==========

type FullTreeNode = {
  id: number;
  name: string | null;
  type: "group" | "category";
  level: number;
  groupId?: number | null;
  parentId?: number;
  sortOrder: number;
  children: FullTreeNode[];
};

function buildFullTree(groups: Group[], categories: Category[]): FullTreeNode[] {
  const roots: FullTreeNode[] = [];
  const categoryMap = new Map<number, FullTreeNode>();

  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      type: "category",
      level: 1,
      groupId: cat.groupId,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      children: [],
    });
  });

  const categoryRoots: FullTreeNode[] = [];
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId === 0) {
      categoryRoots.push(node);
    } else {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        categoryRoots.push(node);
      }
    }
  });

  groups.forEach((group) => {
    const groupNode: FullTreeNode = {
      id: group.id,
      name: group.name,
      type: "group",
      level: 0,
      sortOrder: group.sort,
      children: [],
    };
    categoryRoots.forEach((catNode) => {
      if (catNode.groupId === group.id) {
        groupNode.children.push(catNode);
      }
    });
    const sortNodes = (nodes: FullTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(groupNode.children);
    roots.push(groupNode);
  });

  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  return roots;
}

function flattenFullTree(nodes: FullTreeNode[], result: FullTreeNode[] = []): FullTreeNode[] {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children.length > 0) {
      flattenFullTree(node.children, result);
    }
  });
  return result;
}

// ========== MultiSelectCategoryDropdown (same as edit page) ==========

function MultiSelectCategoryDropdown({
  fullTree,
  selectedIds,
  onChange,
  disabled,
}: {
  fullTree: FullTreeNode[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const flatNodes = flattenFullTree(fullTree);

  const filteredNodes = useMemo(() => {
    if (!searchKeyword.trim()) return flatNodes;
    const keyword = searchKeyword.trim().toLowerCase();
    const matchingCategoryIds = new Set<number>();
    const matchingGroupIds = new Set<number>();
    flatNodes.forEach((node) => {
      if (node.type === "category" && node.name?.toLowerCase().includes(keyword)) {
        matchingCategoryIds.add(node.id);
        if (node.groupId) matchingGroupIds.add(node.groupId);
      }
    });
    return flatNodes.filter((node) => {
      if (node.type === "group") return matchingGroupIds.has(node.id);
      return matchingCategoryIds.has(node.id);
    });
  }, [flatNodes, searchKeyword]);

  const handleToggle = (nodeId: number) => {
    if (selectedIds.includes(nodeId)) {
      onChange(selectedIds.filter((id) => id !== nodeId));
    } else {
      onChange([...selectedIds, nodeId]);
    }
  };

  const selectedCount = selectedIds.length;

  const selectedNames = useMemo(() => {
    const names: string[] = [];
    flatNodes.forEach((node) => {
      if (node.type === "category" && selectedIds.includes(node.id) && node.name) {
        names.push(node.name);
      }
    });
    return names;
  }, [flatNodes, selectedIds]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left rounded-md border px-2.5 py-1.5 text-sm flex items-center justify-between ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="truncate flex-1 pr-2">
          {selectedCount > 0
            ? selectedNames.length <= 2
              ? selectedNames.join(", ")
              : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`
            : "Chọn danh mục"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm danh mục..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredNodes.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                Không tìm thấy danh mục phù hợp
              </div>
            ) : (
              filteredNodes.map((node: FullTreeNode) => {
                const isGroup = node.type === "group";
                const indent = node.level > 0 ? node.level * 16 : 0;
                const isChecked = selectedIds.includes(node.id);

                return (
                  <div
                    key={`${node.type}-${node.id}`}
                    style={{ paddingLeft: `${indent}px` }}
                    className={`py-1.5 px-2 rounded ${
                      isGroup
                        ? "font-semibold text-slate-700 text-sm"
                        : "hover:bg-slate-50 cursor-pointer"
                    }`}
                    onClick={() => !isGroup && handleToggle(node.id)}
                  >
                    {isGroup ? (
                      <div className="text-xs uppercase tracking-wide text-slate-500 py-1">
                        {node.name}
                      </div>
                    ) : (
                      <label className="flex items-center cursor-pointer space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(node.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-slate-700 flex-1">{node.name}</span>
                      </label>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selectedCount > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Đã chọn: <strong className="text-emerald-600">{selectedCount}</strong> danh mục</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-600 hover:text-rose-700 font-medium"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== ImageUpload (same as edit page) ==========

function ImageUpload({
  label,
  value,
  onChange,
  onClear,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (file: File | null) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = localPreview || (value ? buildImageUrl(value) : null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    onChange(null);
    onClear?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-start gap-3">
        {preview && (
          <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden">
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
    </div>
  );
}

// ========== Create Product Page ==========

type FormData = {
  code: string;
  name: string;
  nameEn: string;
  status: number;
  isNewProduct: boolean;
  isCombo: boolean;
  sort: number;
  pointSave: number;
  unit: string;
  unitEn: string;
  origin: string;
  originEn: string;
  packed: string;
  pin: string;
  type: string;
  nhaCungCap: number | null;
  documents: string;
};

const initialFormData: FormData = {
  code: "",
  name: "",
  nameEn: "",
  status: 0,
  isNewProduct: false,
  isCombo: false,
  sort: 0,
  pointSave: 0,
  unit: "",
  unitEn: "",
  origin: "",
  originEn: "",
  packed: "",
  pin: "",
  type: "",
  nhaCungCap: null,
  documents: "",
};

function CreateProductPageContent() {
  const router = useRouter();
  const { notify } = useToast();

  const [formData, setFormData] = useState<FormData>({ ...initialFormData });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [imageFiles, setImageFiles] = useState<{
    image?: File | null;
    image2?: File | null;
    image3?: File | null;
    image4?: File | null;
  }>({});

  const [saving, setSaving] = useState(false);

  // Dropdown data
  const [fullTree, setFullTree] = useState<FullTreeNode[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [packedOptions, setPackedOptions] = useState<ViewDataItem[]>([]);
  const [pinOptions, setPinOptions] = useState<ViewDataItem[]>([]);
  const [typeOptions, setTypeOptions] = useState<ViewDataItem[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Load dropdown data on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [groups, categories, suppliersResult, packedData, pinData, typeData] = await Promise.all([
          fetchGroups({ Page: 1, PageSize: 999 }).then((res) => res.items || []),
          fetchAllCategories(),
          fetchSuppliers({ page: 1, pageSize: 999 }),
          fetchViewData("viewPacked").catch(() => []),
          fetchViewData("viewPin").catch(() => []),
          fetchViewData("viewType").catch(() => []),
        ]);
        const tree = buildFullTree(groups, categories);
        setFullTree(tree);
        setSuppliers(suppliersResult.items || []);
        setPackedOptions(packedData);
        setPinOptions(pinData);
        setTypeOptions(typeData);
      } catch (error) {
        console.error("Load dropdown data error:", error);
        notify({ message: "Không tải được dữ liệu dropdown.", variant: "error" });
      } finally {
        setLoadingDropdowns(false);
      }
    };
    loadDropdownData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      notify({ message: "Vui lòng nhập tên sản phẩm.", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      // Upload images if any
      const uploadedImages: { [key: string]: string } = {};
      for (const [key, file] of Object.entries(imageFiles)) {
        if (file) {
          try {
            const url = await uploadImage(file);
            uploadedImages[key] = url;
          } catch (error) {
            console.error(`Upload ${key} error:`, error);
            notify({ message: `Không upload được ${key}`, variant: "error" });
          }
        }
      }

      const payload: UpdateProductRequest = {
        code: formData.code || null,
        name: formData.name,
        nameEn: formData.nameEn || null,
        status: formData.status,
        isNewProduct: formData.isNewProduct,
        isCombo: formData.isCombo,
        sort: formData.sort,
        pointSave: formData.pointSave,
        unit: formData.unit || null,
        unitEn: formData.unitEn || null,
        origin: formData.origin || null,
        originEn: formData.originEn || null,
        packed: formData.packed || null,
        pin: formData.pin || null,
        type: formData.type || null,
        nhaCungCap: formData.nhaCungCap,
        documents: formData.documents || null,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : null,
        ...uploadedImages,
      };

      const newProductId = await createProduct(payload);

      // For combo products, auto-create a default variant
      if (formData.isCombo) {
        try {
          await createProductVariant(newProductId, {
            sku: formData.code ? `${formData.code}-COMBO` : undefined,
            stock: 0,
            status: true,
            options: [],
          });
        } catch (variantError) {
          console.error("Auto-create combo variant error:", variantError);
          // Don't block redirect — product was created successfully
        }
      }

      notify({ message: "Đã tạo sản phẩm thành công!", variant: "success" });

      // Redirect to edit page
      router.push(`/catalog/products/${newProductId}`);
    } catch (error) {
      console.error("Create product error:", error);
      notify({ message: "Tạo sản phẩm thất bại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản Lý / Thêm mới
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Thêm sản phẩm mới
          </h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Quản Lý Sản Phẩm", href: "/catalog/products" },
            { label: "Thêm mới" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {loadingDropdowns ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-lg font-medium mb-2">Đang tải...</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mã sản phẩm */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mã sản phẩm (SKU)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleFieldChange("code", e.target.value)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>

              {/* Ẩn + Sản phẩm mới */}
              <div className="flex items-center gap-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.status !== 0}
                    onChange={(e) => handleFieldChange("status", e.target.checked ? 1 : 0)}
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-sm font-medium text-slate-700">Ẩn</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNewProduct}
                    onChange={(e) => handleFieldChange("isNewProduct", e.target.checked)}
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span className="text-sm font-medium text-slate-700">Sản phẩm mới</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCombo}
                    onChange={(e) => handleFieldChange("isCombo", e.target.checked)}
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-200"
                  />
                  <span className="text-sm font-medium text-slate-700">Sản phẩm Combo</span>
                </label>
              </div>
              {formData.isCombo && (
                <div className="md:col-span-2">
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-violet-700">
                      Sản phẩm combo chứa nhiều variant con bên trong. Sau khi tạo, bạn có thể quản lý thành phần combo trong tab <strong>&quot;Thành phần Combo&quot;</strong> ở trang chỉnh sửa.
                    </div>
                  </div>
                </div>
              )}

              {/* Tên sản phẩm */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên sản phẩm (VN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>

              {/* Tên tiếng Anh */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên sản phẩm (EN)
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => handleFieldChange("nameEn", e.target.value)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Danh mục + Nhà cung cấp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Danh mục sản phẩm
                </label>
                <MultiSelectCategoryDropdown
                  fullTree={fullTree}
                  selectedIds={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nhà cung cấp
                </label>
                <select
                  value={formData.nhaCungCap ?? ""}
                  onChange={(e) => handleFieldChange("nhaCungCap", e.target.value ? parseInt(e.target.value) : null)}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kiểu chân + Số chân */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kiểu chân
                </label>
                <select
                  value={formData.packed}
                  onChange={(e) => handleFieldChange("packed", e.target.value || "")}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">-- Chọn --</option>
                  {packedOptions.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kiểu chân (tùy chỉnh)
                </label>
                <input
                  type="text"
                  value={formData.packed}
                  onChange={(e) => handleFieldChange("packed", e.target.value || "")}
                  disabled={saving}
                  placeholder="Nhập tùy chỉnh"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Số chân
                </label>
                <select
                  value={formData.pin}
                  onChange={(e) => handleFieldChange("pin", e.target.value || "")}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">-- Chọn --</option>
                  {pinOptions.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Số chân (tùy chỉnh)
                </label>
                <input
                  type="text"
                  value={formData.pin}
                  onChange={(e) => handleFieldChange("pin", e.target.value || "")}
                  disabled={saving}
                  placeholder="Nhập tùy chỉnh"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Chủng loại + Thứ tự + Điểm tích lũy */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Chủng loại
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleFieldChange("type", e.target.value || "")}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">-- Chọn --</option>
                  {typeOptions.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Chủng loại (tùy chỉnh)
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => handleFieldChange("type", e.target.value || "")}
                  disabled={saving}
                  placeholder="Nhập tùy chỉnh"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Thứ tự sắp xếp
                </label>
                <input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => handleFieldChange("sort", parseInt(e.target.value) || 0)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Điểm tích lũy
                </label>
                <input
                  type="number"
                  value={formData.pointSave}
                  onChange={(e) => handleFieldChange("pointSave", parseInt(e.target.value) || 0)}
                  disabled={saving}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Đơn vị + Xuất xứ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Đơn vị tính (VN)
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleFieldChange("unit", e.target.value)}
                  disabled={saving}
                  placeholder="VD: Cái, Bộ..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Đơn vị tính (EN)
                </label>
                <input
                  type="text"
                  value={formData.unitEn}
                  onChange={(e) => handleFieldChange("unitEn", e.target.value)}
                  disabled={saving}
                  placeholder="Ex: Piece, Set..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Xuất xứ (VN)
                </label>
                <input
                  type="text"
                  value={formData.origin}
                  onChange={(e) => handleFieldChange("origin", e.target.value)}
                  disabled={saving}
                  placeholder="VD: Việt Nam..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Xuất xứ (EN)
                </label>
                <input
                  type="text"
                  value={formData.originEn}
                  onChange={(e) => handleFieldChange("originEn", e.target.value)}
                  disabled={saving}
                  placeholder="Ex: Vietnam..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Tài liệu */}
            <RichTextEditor
              label="Tài liệu"
              value={formData.documents}
              onChange={(value) => handleFieldChange("documents", value)}
              placeholder="Nhập nội dung tài liệu..."
              uploadModule="products"
              minHeight={200}
            />

            {/* Images */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-md font-semibold text-slate-900">Hình ảnh sản phẩm</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUpload
                  label="Ảnh chính"
                  value={null}
                  onChange={(file) => setImageFiles((prev) => ({ ...prev, image: file }))}
                  disabled={saving}
                />
                <ImageUpload
                  label="Ảnh 2"
                  value={null}
                  onChange={(file) => setImageFiles((prev) => ({ ...prev, image2: file }))}
                  disabled={saving}
                />
                <ImageUpload
                  label="Ảnh 3"
                  value={null}
                  onChange={(file) => setImageFiles((prev) => ({ ...prev, image3: file }))}
                  disabled={saving}
                />
                <ImageUpload
                  label="Ảnh 4"
                  value={null}
                  onChange={(file) => setImageFiles((prev) => ({ ...prev, image4: file }))}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-6">
              <button
                onClick={() => router.push("/catalog/products")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Đang tạo..." : "Tạo sản phẩm"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateProductPage() {
  return <CreateProductPageContent />;
}
