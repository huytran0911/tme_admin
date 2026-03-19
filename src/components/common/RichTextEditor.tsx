"use client";

import dynamic from "next/dynamic";

// Dynamic import TipTapEditor để tránh SSR issues
const TipTapEditorWrapper = dynamic(
  () => import("./TipTapEditor").then((mod) => ({ default: mod.TipTapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center bg-slate-50 text-sm text-slate-400 rounded-lg border border-slate-200">
        Đang tải trình soạn thảo...
      </div>
    ),
  }
);

type RichTextEditorProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  uploadModule?: string;
  /** Minimum height of editor in pixels (default: 320) */
  minHeight?: number;
};

export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  className = "",
  placeholder,
  onImageUpload,
  uploadModule = "products",
  minHeight,
}: RichTextEditorProps) {
  return (
    <TipTapEditorWrapper
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      error={error}
      className={className}
      onImageUpload={onImageUpload}
      uploadModule={uploadModule}
      minHeight={minHeight}
    />
  );
}
