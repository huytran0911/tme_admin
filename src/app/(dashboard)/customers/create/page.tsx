"use client";

import { useRouter } from "next/navigation";
import { createCustomer } from "@/features/customers/api";
import { CustomerForm, type CustomerFormValues } from "@/components/customers/CustomerForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

export default function CustomerCreatePage() {
  const router = useRouter();
  const { notify } = useToast();

  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      await createCustomer({
        name: values.name || undefined,
        email: values.email || undefined,
        userName: values.userName || undefined,
        phone: values.phone || undefined,
        fax: values.fax || undefined,
        website: values.website || undefined,
        company: values.company || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        sex: values.sex,
        status: values.status,
        recieveNewProduct: values.recieveNewProduct,
        recieveNewSpecial: values.recieveNewSpecial,
        lang: "vi",
      });
      notify({ message: "Tạo thành viên thành công.", variant: "success" });
      router.push("/customers");
    } catch (err) {
      console.error("Failed to create customer:", err);
      notify({ message: "Không thể tạo thành viên. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Tạo mới</p>
          <h1 className="text-2xl font-semibold text-slate-900">Thành viên</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Thành viên", href: "/customers" },
            { label: "Tạo mới" },
          ]}
        />
      </div>

      <CustomerForm onSubmit={handleSubmit} />
    </div>
  );
}
