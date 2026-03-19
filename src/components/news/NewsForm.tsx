"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { TipTapEditor } from "@/components/common/TipTapEditor";
import { NewsStatus } from "@/features/news/types";
import { uploadNewsImage } from "@/features/news/api";
import { NewsType } from "@/features/news";
import { collapseMediaUrls } from "@/lib/media";
import { buildImageUrl } from "@/lib/utils";

// Validation schema
const newsFormSchema = z.object({
  name: z.string().min(1, "Tiêu đề tiếng Việt là bắt buộc"),
  nameEn: z.string().optional(),
  image: z.string().optional(),
  shortDescription: z.string().optional(),
  shortDescriptionEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  status: z.number(),
  sort: z.number().min(0, "Thứ tự phải >= 0"),
  typeNews: z.string().optional(),
});

export type NewsFormValues = z.infer<typeof newsFormSchema>;

type NewsFormProps = {
  defaultValues?: Partial<NewsFormValues>;
  onSubmit: (values: NewsFormValues) => Promise<void>;
  isEdit?: boolean;
};

export function NewsForm({ defaultValues, onSubmit, isEdit = false }: NewsFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    defaultValues?.image ? buildImageUrl(defaultValues.image) : null
  );
  const [uploading, setUploading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      nameEn: defaultValues?.nameEn ?? "",
      image: defaultValues?.image ?? "",
      shortDescription: defaultValues?.shortDescription ?? "",
      shortDescriptionEn: defaultValues?.shortDescriptionEn ?? "",
      description: defaultValues?.description ?? "",
      descriptionEn: defaultValues?.descriptionEn ?? "",
      status: defaultValues?.status ?? NewsStatus.ACTIVE,
      sort: defaultValues?.sort ?? 1,
      typeNews: defaultValues?.typeNews ?? NewsType.News,
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Tối đa 5MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadNewsImage(file);
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

  const processSubmit = async (values: NewsFormValues) => {
    // Collapse media URLs before submitting
    const processedValues: NewsFormValues = {
      ...values,
      description: values.description ? collapseMediaUrls(values.description) : "",
      descriptionEn: values.descriptionEn ? collapseMediaUrls(values.descriptionEn) : "",
    };
    await onSubmit(processedValues);
  };

  return (
    <form
      className="space-y-8"
      onSubmit={handleSubmit(processSubmit)}
    >
      {/* Basic Info Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vietnamese Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Tiêu đề (Tiếng Việt) <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập tiêu đề tin tức"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          {/* English Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="nameEn">
              Tiêu đề (Tiếng Anh)
            </label>
            <input
              id="nameEn"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Enter news title"
              {...register("nameEn")}
            />
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="sort">
              Thứ tự hiển thị
            </label>
            <input
              id="sort"
              type="number"
              min={0}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="1"
              {...register("sort", { valueAsNumber: true })}
            />
            {errors.sort && (
              <p className="text-xs text-rose-600">{errors.sort.message}</p>
            )}
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
                      checked={field.value === NewsStatus.ACTIVE}
                      onChange={() => field.onChange(NewsStatus.ACTIVE)}
                      className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Hiển thị</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={field.value === NewsStatus.HIDDEN}
                      onChange={() => field.onChange(NewsStatus.HIDDEN)}
                      className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">Ẩn</span>
                  </label>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Hình ảnh đại diện</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="flex items-start gap-6">
          {/* Image Preview */}
          <div className="relative h-40 w-60 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
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

          {/* Upload Button */}
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

      {/* Short Description Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Mô tả ngắn</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vietnamese Short Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="shortDescription">
              Mô tả ngắn (Tiếng Việt)
            </label>
            <textarea
              id="shortDescription"
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập mô tả ngắn gọn về tin tức..."
              {...register("shortDescription")}
            />
          </div>

          {/* English Short Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="shortDescriptionEn">
              Mô tả ngắn (Tiếng Anh)
            </label>
            <textarea
              id="shortDescriptionEn"
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Enter short description..."
              {...register("shortDescriptionEn")}
            />
          </div>
        </div>
      </div>

      {/* Full Description Section - Vietnamese */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Nội dung chi tiết (Tiếng Việt)</h2>

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TipTapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Nhập nội dung chi tiết của tin tức..."
              uploadModule="news"
            />
          )}
        />
      </div>

      {/* Full Description Section - English */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Nội dung chi tiết (Tiếng Anh)</h2>

        <Controller
          control={control}
          name="descriptionEn"
          render={({ field }) => (
            <TipTapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Enter detailed content..."
              uploadModule="news"
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
          {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật tin tức" : "Tạo tin tức"}
        </button>
      </div>
    </form>
  );
}
