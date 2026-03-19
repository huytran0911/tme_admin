"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { TipTapEditor } from "@/components/common/TipTapEditor";

// Validation schema
const saleOffFormSchema = z.object({
  name: z.string().min(1, "Tiêu đề là bắt buộc"),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  content: z.string().optional(),
  contentEn: z.string().optional(),
  applyFrom: z.string().optional(),
  applyTo: z.string().optional(),
  forever: z.boolean().optional(),
});

export type SaleOffFormValues = z.infer<typeof saleOffFormSchema>;

type SaleOffFormProps = {
  defaultValues?: Partial<SaleOffFormValues>;
  onSubmit: (values: SaleOffFormValues) => Promise<void>;
  isEdit?: boolean;
};

export function SaleOffForm({ defaultValues, onSubmit, isEdit = false }: SaleOffFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleOffFormValues>({
    resolver: zodResolver(saleOffFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      nameEn: defaultValues?.nameEn ?? "",
      description: defaultValues?.description ?? "",
      descriptionEn: defaultValues?.descriptionEn ?? "",
      content: defaultValues?.content ?? "",
      contentEn: defaultValues?.contentEn ?? "",
      applyFrom: defaultValues?.applyFrom ?? "",
      applyTo: defaultValues?.applyTo ?? "",
      forever: defaultValues?.forever ?? false,
    },
  });

  const isForever = watch("forever");

  const processSubmit = async (values: SaleOffFormValues) => {
    // If forever is checked, clear the dates
    const processedValues: SaleOffFormValues = {
      ...values,
      applyFrom: values.forever ? "" : values.applyFrom,
      applyTo: values.forever ? "" : values.applyTo,
    };
    await onSubmit(processedValues);
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit(processSubmit)}>
      {/* Basic Info Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vietnamese Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập tiêu đề chiến dịch"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
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
              placeholder="Enter campaign title"
              {...register("nameEn")}
            />
          </div>
        </div>
      </div>

      {/* Date Range Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thời gian áp dụng</h2>

        <div className="space-y-4">
          {/* Forever Checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="forever"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              {...register("forever")}
              onChange={(e) => {
                setValue("forever", e.target.checked);
                if (e.target.checked) {
                  setValue("applyFrom", "");
                  setValue("applyTo", "");
                }
              }}
            />
            <label htmlFor="forever" className="text-sm font-medium text-slate-700">
              Áp dụng mãi mãi
            </label>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="applyFrom">
                Áp dụng từ ngày
              </label>
              <input
                id="applyFrom"
                type="date"
                disabled={isForever}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                {...register("applyFrom")}
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="applyTo">
                Áp dụng đến ngày
              </label>
              <input
                id="applyTo"
                type="date"
                disabled={isForever}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                {...register("applyTo")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Short Description Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Mô tả</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vietnamese Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="description">
              Mô tả (Tiếng Việt)
            </label>
            <textarea
              id="description"
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập mô tả chiến dịch..."
              {...register("description")}
            />
          </div>

          {/* English Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="descriptionEn">
              Mô tả (Tiếng Anh)
            </label>
            <textarea
              id="descriptionEn"
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Enter campaign description..."
              {...register("descriptionEn")}
            />
          </div>
        </div>
      </div>

      {/* Full Content Section - Vietnamese */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Nội dung chi tiết (Tiếng Việt)</h2>

        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <TipTapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Nhập nội dung chi tiết của chiến dịch..."
              uploadModule="sale-off"
            />
          )}
        />
      </div>

      {/* Full Content Section - English */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Nội dung chi tiết (Tiếng Anh)</h2>

        <Controller
          control={control}
          name="contentEn"
          render={({ field }) => (
            <TipTapEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Enter detailed content..."
              uploadModule="sale-off"
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
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}
