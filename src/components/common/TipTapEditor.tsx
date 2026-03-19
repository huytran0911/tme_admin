"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { expandMediaUrls, getMediaUrl } from "@/lib/media";

// ============================================================================
// Types
// ============================================================================

type TipTapEditorProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
  /** Custom upload function. If not provided, will use default API upload */
  onImageUpload?: (file: File) => Promise<string>;
  /** Module name for default API upload (e.g., "payment-methods", "news") */
  uploadModule?: string;
  /** Minimum height of editor in pixels (default: 320) */
  minHeight?: number;
};

// ============================================================================
// Default Image Upload Function
// ============================================================================

async function defaultUploadImage(file: File, module: string = "editor"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module },
    headers: { "Content-Type": "multipart/form-data" },
  });

  // Unwrap response
  const response = data?.data ?? data;
  const path = response?.url ?? response?.path;

  if (!path) {
    throw new Error("Upload API không trả về URL");
  }

  // Return full URL for immediate display (will be collapsed to relative when saving)
  return getMediaUrl(path);
}

// ============================================================================
// Toolbar Button Component
// ============================================================================

type ToolbarButtonProps = {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-slate-200" />;
}

// ============================================================================
// Toolbar Component
// ============================================================================

type ToolbarProps = {
  editor: ReturnType<typeof useEditor>;
  onImageUpload?: (file: File) => Promise<string>;
  uploadModule?: string;
};

function Toolbar({ editor, onImageUpload, uploadModule }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // All hooks must be called before any early return
  const addImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Nhập URL hình ảnh:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Nhập URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  // Early return after all hooks
  if (!editor) return null;

  const handleImageClick = () => {
    // Always open file picker
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const uploadFn = onImageUpload || ((f: File) => defaultUploadImage(f, uploadModule));
      const url = await uploadFn(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload hình ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Hoàn tác"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Làm lại"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <span className="text-xs font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <span className="text-xs font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <span className="text-xs font-bold">H3</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Basic formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="In đậm"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="In nghiêng"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0v16m0 0h-4m4 0h4" transform="skewX(-12)" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Gạch chân"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Gạch ngang"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4m0 4v8M5 12h14" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Highlight */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
        isActive={editor.isActive("highlight")}
        title="Highlight vàng"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.243 4.515l-6.738 6.738-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.738-6.738-4.243-4.243zm6.364 3.536a1 1 0 010 1.414l-7.779 7.779-2.12.707-1.415 1.414a1 1 0 01-1.414 0l-4.243-4.243a1 1 0 010-1.414l1.414-1.414.707-2.121 7.779-7.779a1 1 0 011.414 0l5.657 5.657z" />
        </svg>
      </ToolbarButton>

      {/* Text colors */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setColor("#ef4444").run()}
        isActive={editor.isActive("textStyle", { color: "#ef4444" })}
        title="Màu đỏ"
      >
        <span className="text-sm font-bold text-red-500">A</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setColor("#22c55e").run()}
        isActive={editor.isActive("textStyle", { color: "#22c55e" })}
        title="Màu xanh lá"
      >
        <span className="text-sm font-bold text-green-500">A</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setColor("#3b82f6").run()}
        isActive={editor.isActive("textStyle", { color: "#3b82f6" })}
        title="Màu xanh dương"
      >
        <span className="text-sm font-bold text-blue-500">A</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetColor().run()}
        title="Xóa màu"
      >
        <span className="text-sm font-bold text-slate-400">A</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Căn trái"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Căn giữa"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M5 18h14" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Căn phải"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M10 12h10M6 18h14" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        title="Căn đều"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Danh sách"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Danh sách số"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
          <text x="2" y="8" className="text-[8px]" fill="currentColor">1</text>
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Link, Image, Table */}
      <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Chèn link">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarButton>

      {/* Image Upload Button */}
      <ToolbarButton onClick={handleImageClick} disabled={uploading} title="Upload hình ảnh">
        {uploading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </ToolbarButton>

      {/* Image by URL Button */}
      <ToolbarButton onClick={addImageByUrl} title="Chèn hình từ URL">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h4m0 0v4m0-4l-4 4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={addTable} title="Chèn bảng">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block Quote & Code */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Trích dẫn"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code block"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Horizontal Rule */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Đường kẻ ngang"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

// ============================================================================
// Main Editor Component
// ============================================================================

export function TipTapEditor({
  label,
  value,
  onChange,
  error,
  className = "",
  placeholder = "Nhập nội dung...",
  onImageUpload,
  uploadModule = "editor",
  minHeight = 320,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: expandMediaUrls(value),
    onUpdate: ({ editor }) => {
      // Keep full URLs in state for display, will be collapsed when submitting form
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    const expandedValue = expandMediaUrls(value);
    if (editor && expandedValue !== editor.getHTML()) {
      editor.commands.setContent(expandedValue, false);
    }
  }, [editor, value]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label ? <label className="text-sm font-medium text-slate-700">{label}</label> : null}
      <div
        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
          error ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
        }`}
      >
        <Toolbar editor={editor} onImageUpload={onImageUpload} uploadModule={uploadModule} />
        <EditorContent editor={editor} />
      </div>

      {/* Editor Styles */}
      <style jsx global>{`
        /* TipTap Editor Styles */
        .ProseMirror {
          /* min-height is set via inline style for flexibility */
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .ProseMirror:focus {
          outline: none;
        }

        /* Headings */
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.67em 0;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.75em 0;
        }
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.83em 0;
        }

        /* Lists */
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
        }

        /* Blockquote */
        .ProseMirror blockquote {
          border-left: 3px solid #e2e8f0;
          margin: 1em 0;
          padding-left: 1em;
          color: #64748b;
        }

        /* Code Block */
        .ProseMirror pre {
          background: #1e293b;
          border-radius: 0.5rem;
          color: #e2e8f0;
          font-family: ui-monospace, monospace;
          padding: 1rem;
          margin: 1em 0;
        }
        .ProseMirror code {
          background: #f1f5f9;
          border-radius: 0.25rem;
          padding: 0.125em 0.25em;
          font-size: 0.875em;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
        }

        /* Table */
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1em 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #e2e8f0;
          min-width: 1em;
          padding: 0.5em;
          position: relative;
          vertical-align: top;
        }
        .ProseMirror th {
          background: #f8fafc;
          font-weight: 600;
        }

        /* Horizontal Rule */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 1.5em 0;
        }

        /* Link */
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
        }

        /* Image */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }

        /* Highlight */
        .ProseMirror mark {
          background-color: #fef08a;
          border-radius: 0.125em;
          padding: 0.125em 0;
        }
      `}</style>

      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
