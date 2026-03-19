"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchCustomerById, updateCustomer } from "@/features/customers/api";
import type { CustomerDetail } from "@/features/customers/types";
import { CustomerForm, type CustomerFormValues } from "@/components/customers/CustomerForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

type Props = {
  params: Promise<{ id: string }>;
};

export default function CustomerEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchCustomer = async () => {
      try {
        const data = await fetchCustomerById(parseInt(id, 10));
        if (!mounted) return;
        setCustomer(data);
      } catch (err) {
        console.error("Failed to fetch customer:", err);
        if (!mounted) return;
        setError("Không thể tải thông tin thành viên. Vui lòng thử lại.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCustomer();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      await updateCustomer(parseInt(id, 10), {
        name: values.name || undefined,
        email: values.email || undefined,
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
      notify({ message: "Cập nhật thành viên thành công.", variant: "success" });
      router.push("/customers");
    } catch (err) {
      console.error("Failed to update customer:", err);
      notify({ message: "Không thể cập nhật thành viên. Vui lòng thử lại.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải thông tin thành viên...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        {error || "Không tìm thấy thành viên."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Chỉnh sửa</p>
          <h1 className="text-2xl font-semibold text-slate-900">{customer.name}</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Thành viên", href: "/customers" },
            { label: "Chỉnh sửa" },
          ]}
        />
      </div>

      <CustomerForm
        defaultValues={{
          name: customer.name || "",
          email: customer.email || "",
          userName: customer.userName || "",
          phone: customer.phone || "",
          fax: customer.fax || "",
          website: customer.website || "",
          company: customer.company || "",
          address: customer.address || "",
          city: customer.city || "",
          country: customer.country || "",
          sex: customer.sex ?? 0,
          status: customer.status ?? "0",
          recieveNewProduct: customer.recieveNewProduct ?? 1,
          recieveNewSpecial: customer.recieveNewSpecial ?? 1,
        }}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
