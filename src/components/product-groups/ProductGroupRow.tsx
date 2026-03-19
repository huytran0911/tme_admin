import Link from "next/link";
import type { ProductGroup } from "@/types/product-group";

type ProductGroupRowProps = {
  group: ProductGroup;
  checked: boolean;
  onToggle: (id: number) => void;
  onChange: (group: ProductGroup) => void;
};

export function ProductGroupRow({
  group,
  checked,
  onToggle,
  onChange,
}: ProductGroupRowProps) {
  const updateField = <K extends keyof ProductGroup>(
    key: K,
    value: ProductGroup[K],
  ) => {
    onChange({ ...group, [key]: value });
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-2 py-1">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
          checked={checked}
          onChange={() => onToggle(group.id)}
        />
      </td>
      <td className="px-2 py-1">
        <input
          value={group.nameVi}
          onChange={(e) => updateField("nameVi", e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          placeholder="Tên nhóm"
        />
      </td>
      <td className="px-2 py-1">
        <input
          value={group.nameEn}
          onChange={(e) => updateField("nameEn", e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          placeholder="English name"
        />
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          {/* <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">
            {group.imageUrl ? (
              <img
                src={group.imageUrl}
                alt={group.nameVi}
                className="h-full w-full object-cover"
              />
            ) : (
              "Ảnh"
            )}
          </div> */}
          <input
            value={group.imageUrl ?? ""}
            onChange={(e) => updateField("imageUrl", e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="https://..."
          />
        </div>
      </td>
      <td className="px-2 py-1">
        <SelectField
          value={group.displayType}
          onChange={(val) => updateField("displayType", val)}
          label="Kiểu hiển thị"
        />
      </td>
      <td className="px-2 py-1">
        <SelectField
          value={group.slideType}
          onChange={(val) => updateField("slideType", val)}
          label="Kiểu slides"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          value={group.sortOrder}
          onChange={(e) => updateField("sortOrder", Number(e.target.value))}
          className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="number"
          value={group.sortOrderNew}
          onChange={(e) => updateField("sortOrderNew", Number(e.target.value))}
          className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </td>
      <td className="px-2 py-1 text-right">
        <Link
          href={`/product-groups/${group.id}/categories`}
          className="inline-flex items-center rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.75 text-[10px] font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(56,199,147,0.18)]"
        >
          Xem danh mục
        </Link>
      </td>
    </tr>
  );
}

function SelectField({
  value,
  onChange,
  label,
}: {
  value: 0 | 1 | 2;
  onChange: (val: 0 | 1 | 2) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as 0 | 1 | 2)}
      className="min-w-[5.25rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      aria-label={label}
    >
      <option value={0}>0</option>
      <option value={1}>1</option>
      <option value={2}>2</option>
    </select>
  );
}
