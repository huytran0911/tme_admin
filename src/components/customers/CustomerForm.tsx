"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

// Validation schema - matches API CustomerDetailResponse
const customerFormSchema = z.object({
  name: z.string().min(1, "Tên khách hàng là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  userName: z.string().min(4, "Username phải có ít nhất 4 ký tự"),
  phone: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  sex: z.number().optional(), // 0 = male, 1 = female
  status: z.string().optional(), // "0" = active, "1" = locked
  recieveNewProduct: z.number().optional(), // 0 or 1
  recieveNewSpecial: z.number().optional(), // 0 or 1
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

type CustomerFormProps = {
  defaultValues?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  isEdit?: boolean;
};

export function CustomerForm({ defaultValues, onSubmit, isEdit = false }: CustomerFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      userName: defaultValues?.userName ?? "",
      phone: defaultValues?.phone ?? "",
      fax: defaultValues?.fax ?? "",
      website: defaultValues?.website ?? "",
      company: defaultValues?.company ?? "",
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      country: defaultValues?.country ?? "VN",
      sex: defaultValues?.sex ?? 0,
      status: defaultValues?.status ?? "0",
      recieveNewProduct: defaultValues?.recieveNewProduct ?? 1,
      recieveNewSpecial: defaultValues?.recieveNewSpecial ?? 1,
    },
  });

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
      {/* Basic Info Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thông tin cơ bản</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Tên khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập tên khách hàng"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="email@example.com"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="userName">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              id="userName"
              type="text"
              disabled={isEdit}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Ít nhất 4 ký tự"
              {...register("userName")}
            />
            {errors.userName && <p className="text-xs text-rose-600">{errors.userName.message}</p>}
            {isEdit && <p className="text-xs text-slate-500">Username không thể thay đổi</p>}
          </div>
        </div>
      </div>

      {/* Gender & Status */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Giới tính & Trạng thái</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gender (sex: 0 = male, 1 = female) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Giới tính</label>
            <Controller
              name="sex"
              control={control}
              render={({ field }) => (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="0"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      checked={field.value === 0}
                      onChange={() => field.onChange(0)}
                    />
                    <span className="text-sm text-slate-700">Nam</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="1"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      checked={field.value === 1}
                      onChange={() => field.onChange(1)}
                    />
                    <span className="text-sm text-slate-700">Nữ</span>
                  </label>
                </div>
              )}
            />
          </div>

          {/* Active Status (status: "0" = active, "1" = locked) */}
          <div className="space-y-2">
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-200"
                    checked={field.value === "1"}
                    onChange={(e) => field.onChange(e.target.checked ? "1" : "0")}
                  />
                  <span className="text-sm font-medium text-slate-700">Khóa tài khoản</span>
                </label>
              )}
            />
            <p className="text-xs text-slate-500">Check để khóa tài khoản, bỏ check để kích hoạt</p>
          </div>
        </div>
      </div>

      {/* Contact Info Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Thông tin liên hệ</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="company">
              Công ty
            </label>
            <input
              id="company"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Tên công ty"
              {...register("company")}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="phone">
              Số điện thoại
            </label>
            <input
              id="phone"
              type="tel"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0xxxxxxxxx"
              {...register("phone")}
            />
          </div>

          {/* Fax */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="fax">
              Số fax
            </label>
            <input
              id="fax"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Số fax"
              {...register("fax")}
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="website">
              Website
            </label>
            <input
              id="website"
              type="url"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="https://example.com"
              {...register("website")}
            />
          </div>

          {/* Address */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="address">
              Địa chỉ
            </label>
            <input
              id="address"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Địa chỉ chi tiết"
              {...register("address")}
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="city">
              Thành phố
            </label>
            <input
              id="city"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Thành phố"
              {...register("city")}
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="country">
              Quốc gia
            </label>
            <input
              id="country"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="VN"
              {...register("country")}
            />
          </div>
        </div>
      </div>

      {/* Notifications Section (recieveNewProduct/recieveNewSpecial: 0 or 1) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Nhận thông báo</h2>

        <div className="space-y-4">
          <Controller
            name="recieveNewProduct"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={field.value === 1}
                  onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
                />
                <span className="text-sm text-slate-700">Nhận tin sản phẩm</span>
              </label>
            )}
          />
          <Controller
            name="recieveNewSpecial"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={field.value === 1}
                  onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
                />
                <span className="text-sm text-slate-700">Nhận tin đặc biệt</span>
              </label>
            )}
          />
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
