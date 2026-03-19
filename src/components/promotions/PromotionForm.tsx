"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

// Validation schema
const promotionFormSchema = z.object({
  name: z.string().min(1, "Tiêu đề khuyến mãi là bắt buộc"),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  content: z.string().optional(),
  contentEn: z.string().optional(),
  applyFrom: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  applyTo: z.string().min(1, "Ngày kết thúc là bắt buộc"),
  saleOff: z.number().min(0, "Giá trị khuyến mãi phải >= 0"),
  isPercent: z.boolean(),
  freeTransportFee: z.boolean(),
  applyForTotal: z.number().min(0, "Áp dụng cho tổng tiền phải >= 0"),
  sort: z.number().min(0, "Thứ tự phải >= 0"),
  forever: z.boolean(),
  popup: z.boolean(),
  image: z.string().optional(),
  point: z.number().min(0, "Điểm phải >= 0"),
  menu: z.boolean(),
});

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

type PromotionFormProps = {
  defaultValues?: Partial<PromotionFormValues>;
  onSubmit: (values: PromotionFormValues) => Promise<void>;
  isEdit?: boolean;
};

export function PromotionForm({ defaultValues, onSubmit, isEdit = false }: PromotionFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      nameEn: defaultValues?.nameEn ?? "",
      description: defaultValues?.description ?? "",
      descriptionEn: defaultValues?.descriptionEn ?? "",
      content: defaultValues?.content ?? "",
      contentEn: defaultValues?.contentEn ?? "",
      applyFrom: defaultValues?.applyFrom ?? "",
      applyTo: defaultValues?.applyTo ?? "",
      saleOff: defaultValues?.saleOff ?? 0,
      isPercent: defaultValues?.isPercent ?? false,
      freeTransportFee: defaultValues?.freeTransportFee ?? false,
      applyForTotal: defaultValues?.applyForTotal ?? 0,
      sort: defaultValues?.sort ?? 0,
      forever: defaultValues?.forever ?? false,
      popup: defaultValues?.popup ?? false,
      image: defaultValues?.image ?? "",
      point: defaultValues?.point ?? 0,
      menu: defaultValues?.menu ?? false,
    },
  });

  const forever = watch("forever");

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
      {/* Basic Info Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Name VN */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Tiêu đề khuyến mãi <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập tiêu đề khuyến mãi"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          {/* Name EN */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="nameEn">
              Tiêu đề (English)
            </label>
            <input
              id="nameEn"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Promotion title"
              {...register("nameEn")}
            />
          </div>

          {/* Description VN */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="description">
              Mô tả
            </label>
            <textarea
              id="description"
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập mô tả"
              {...register("description")}
            />
          </div>

          {/* Description EN */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="descriptionEn">
              Mô tả (English)
            </label>
            <textarea
              id="descriptionEn"
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Description"
              {...register("descriptionEn")}
            />
          </div>

          {/* Content VN */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="content">
              Nội dung
            </label>
            <textarea
              id="content"
              rows={6}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập nội dung chi tiết"
              {...register("content")}
            />
          </div>

          {/* Content EN */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="contentEn">
              Nội dung (English)
            </label>
            <textarea
              id="contentEn"
              rows={6}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Content"
              {...register("contentEn")}
            />
          </div>
        </div>
      </div>

      {/* Date Range Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thời gian áp dụng</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Apply From */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="applyFrom">
              Áp dụng từ <span className="text-rose-500">*</span>
            </label>
            <input
              id="applyFrom"
              type="date"
              disabled={forever}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              {...register("applyFrom")}
            />
            {errors.applyFrom && <p className="text-xs text-rose-600">{errors.applyFrom.message}</p>}
          </div>

          {/* Apply To */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="applyTo">
              Áp dụng đến <span className="text-rose-500">*</span>
            </label>
            <input
              id="applyTo"
              type="date"
              disabled={forever}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              {...register("applyTo")}
            />
            {errors.applyTo && <p className="text-xs text-rose-600">{errors.applyTo.message}</p>}
          </div>

          {/* Forever checkbox */}
          <div className="space-y-2 lg:col-span-2">
            <Controller
              name="forever"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-700">Khuyến mãi không kết thúc</span>
                </label>
              )}
            />
          </div>
        </div>
      </div>

      {/* Promotion Value Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Giá trị khuyến mãi</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sale Off */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="saleOff">
              Giá trị khuyến mãi <span className="text-rose-500">*</span>
            </label>
            <input
              id="saleOff"
              type="number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0"
              {...register("saleOff", { valueAsNumber: true })}
            />
            {errors.saleOff && <p className="text-xs text-rose-600">{errors.saleOff.message}</p>}
          </div>

          {/* Apply For Total */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="applyForTotal">
              Áp dụng cho tổng tiền
            </label>
            <input
              id="applyForTotal"
              type="number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0"
              {...register("applyForTotal", { valueAsNumber: true })}
            />
            {errors.applyForTotal && <p className="text-xs text-rose-600">{errors.applyForTotal.message}</p>}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 lg:col-span-2">
            <Controller
              name="isPercent"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">Phần trăm</span>
                </label>
              )}
            />

            <Controller
              name="freeTransportFee"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">Miễn phí vận chuyển</span>
                </label>
              )}
            />
          </div>
        </div>
      </div>

      {/* Other Settings Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Cài đặt khác</h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="sort">
              Thứ tự
            </label>
            <input
              id="sort"
              type="number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0"
              {...register("sort", { valueAsNumber: true })}
            />
            {errors.sort && <p className="text-xs text-rose-600">{errors.sort.message}</p>}
          </div>

          {/* Point */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="point">
              Điểm
            </label>
            <input
              id="point"
              type="number"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0"
              {...register("point", { valueAsNumber: true })}
            />
            {errors.point && <p className="text-xs text-rose-600">{errors.point.message}</p>}
          </div>

          {/* Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="image">
              Hình ảnh (URL)
            </label>
            <input
              id="image"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="https://..."
              {...register("image")}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 lg:col-span-3">
            <Controller
              name="popup"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">Popup</span>
                </label>
              )}
            />

            <Controller
              name="menu"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">Hiển thị trong menu</span>
                </label>
              )}
            />
          </div>
        </div>
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
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}
