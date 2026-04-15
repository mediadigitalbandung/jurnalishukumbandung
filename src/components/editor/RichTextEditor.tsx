"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import LinkExt from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  LinkIcon,
  Youtube as YoutubeIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Code,
  Minus,
  Upload,
  Images,
  X,
  Loader2,
  ImagePlus,
  Check,
  Eye,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState, useRef, useEffect } from "react";

/*
 * Caption strategy: use standard img attributes that TipTap already supports.
 *   alt  = caption text (also good for accessibility)
 *   title = source / photographer name
 * In the public article view, img[alt] is transformed into <figure>/<figcaption>.
 */

/* ─── Image compression (WebP, max 1200px) ─── */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_W = 1200;
        let w = img.width,
          h = img.height;
        if (w > MAX_W) {
          h = (h * MAX_W) / w;
          w = MAX_W;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob failed"))),
          "image/webp",
          0.8
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Types ─── */
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  caption?: string | null;
  source?: string | null;
  usedIn?: string[];
  createdAt: string;
}

/* ─── Toolbar Button ─── */
function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-goto-light text-goto-green"
          : "text-txt-secondary hover:bg-surface-secondary",
        disabled && "cursor-not-allowed opacity-30"
      )}
    >
      {children}
    </button>
  );
}

/* ─── Main Component ─── */
export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Tulis artikel Anda di sini...",
}: RichTextEditorProps) {
  /* Modal state */
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "library">("upload");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [source, setSource] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editSource, setEditSource] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline.configure({}),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-goto-green hover:underline" },
      }),
      ImageResize.configure({ inline: false }),
      Youtube.configure({ width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "article-content prose prose-lg max-w-none font-serif min-h-[400px] px-6 py-4 focus:outline-none",
      },
    },
  });

  /* ── Fetch media library (with pagination) ── */
  const [mediaPage, setMediaPage] = useState(1);
  const [hasMoreMedia, setHasMoreMedia] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMedia = useCallback(async (page = 1, append = false, query = "") => {
    if (page === 1) setLoadingMedia(true);
    else setLoadingMore(true);
    try {
      const q = query ? `&q=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/media?limit=48&page=${page}${q}`);
      const data = await res.json();
      const items = data.data?.media || data.data || [];
      const pagination = data.data?.pagination;
      if (append) setMediaList((prev) => [...prev, ...items]);
      else setMediaList(items);
      setMediaPage(page);
      setHasMoreMedia(pagination ? page < pagination.totalPages : false);
    } catch { /* ignore */ }
    setLoadingMedia(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    if (showImageModal && activeTab === "library") fetchMedia(1);
  }, [showImageModal, activeTab, fetchMedia]);

  /* ── Open modal (reset state) ── */
  const openImageModal = useCallback(() => {
    setSelectedUrl("");
    setPreviewUrl("");
    setCaption("");
    setSource("");
    setViewingMedia(null);
    setEditingMedia(null);
    setMediaSearch("");
    setActiveTab("upload");
    setShowImageModal(true);
  }, []);

  /* ── Save edited caption/source ── */
  const saveMediaEdit = async () => {
    if (!editingMedia) return;
    setSavingEdit(true);
    try {
      await fetch(`/api/media/${editingMedia.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: editCaption, source: editSource }),
      });
      setMediaList((prev) =>
        prev.map((m) =>
          m.id === editingMedia.id ? { ...m, caption: editCaption, source: editSource } : m
        )
      );
      setEditingMedia(null);
    } catch { /* ignore */ }
    setSavingEdit(false);
  };

  /* ── Delete media ── */
  const deleteMedia = async (media: MediaItem) => {
    if (!confirm("Hapus gambar ini dari library?")) return;
    try {
      await fetch(`/api/media?id=${media.id}`, { method: "DELETE" });
      setMediaList((prev) => prev.filter((m) => m.id !== media.id));
      if (selectedUrl === media.url) {
        setSelectedUrl("");
        setPreviewUrl("");
        setCaption("");
        setSource("");
      }
    } catch { /* ignore */ }
  };

  /* ── Handle file upload ── */
  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      alert("Format tidak didukung. Gunakan JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file terlalu besar (maks 10MB).");
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 2 * 1024 * 1024) {
        alert("Gambar masih terlalu besar setelah kompresi.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", compressed, `image-${Date.now()}.webp`);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.url) {
        setSelectedUrl(data.url);
        setPreviewUrl(data.url);

        // Register in media library (fire & forget)
        fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            url: data.url,
            type: "image/webp",
            size: compressed.size,
          }),
        }).catch(() => {});
      } else {
        alert("Gagal mengupload gambar.");
      }
    } catch {
      alert("Gagal mengupload gambar.");
    }
    setUploading(false);
  };

  /* ── Insert image into editor ── */
  const insertImage = () => {
    if (!selectedUrl || !editor) return;

    const alt = caption ? ` alt="${caption}"` : "";
    const titleAttr = source ? ` title="${source}"` : "";
    editor.chain().focus().insertContent(
      `<img src="${selectedUrl}"${alt}${titleAttr} style="width: 100%">`
    ).run();

    // Save caption/source to media record (fire & forget)
    if (caption || source) {
      const selected = mediaList.find((m) => m.url === selectedUrl);
      if (selected) {
        fetch(`/api/media/${selected.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption, source }),
        }).catch(() => {});
      }
    }

    setShowImageModal(false);
  };

  /* ── Other toolbar actions ── */
  const addLink = useCallback(() => {
    const url = window.prompt("Masukkan URL link:");
    if (url && editor) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt("Masukkan URL video YouTube:");
    if (url && editor) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Kutipan"
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block (Pasal)"
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus size={16} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Rata Kiri"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Rata Tengah"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Rata Kanan"
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Rata Kiri Kanan"
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Media */}
        <ToolbarButton onClick={openImageModal} title="Sisipkan Gambar">
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={addLink}
          active={editor.isActive("link")}
          title="Sisipkan Link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="Sisipkan Video YouTube">
          <YoutubeIcon size={16} />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={16} />
        </ToolbarButton>
      </div>

      {/* ── Editor content ── */}
      <EditorContent editor={editor} />

      {/* ── Word count ── */}
      <div className="border-t border-border px-4 py-2 text-xs text-txt-muted">
        {editor.storage.characterCount?.words?.() ?? 0} kata &middot;{" "}
        {editor.storage.characterCount?.characters?.() ?? 0} karakter &middot; ~
        {Math.max(1, Math.ceil((editor.storage.characterCount?.words?.() ?? 0) / 200))}{" "}
        menit baca
      </div>

      {/* ════════════════════════════════════════════════════════════════
          IMAGE MODAL — Upload baru + Media Library + Caption/Source
         ════════════════════════════════════════════════════════════════ */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-bold text-txt-primary">Sisipkan Gambar</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="rounded-full p-1.5 text-txt-secondary hover:bg-surface-secondary"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b px-6">
              <button
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === "upload"
                    ? "border-goto-green text-goto-green"
                    : "border-transparent text-txt-secondary hover:text-txt-primary"
                )}
              >
                <Upload size={15} className="-mt-0.5 mr-1.5 inline" />
                Upload Baru
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={cn(
                  "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === "library"
                    ? "border-goto-green text-goto-green"
                    : "border-transparent text-txt-secondary hover:text-txt-primary"
                )}
              >
                <Images size={15} className="-mt-0.5 mr-1.5 inline" />
                Media Library
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ── Upload Tab ── */}
              {activeTab === "upload" && (
                <div>
                  {!previewUrl ? (
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-10 transition-colors hover:border-goto-green/50 hover:bg-goto-green/5"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-goto-green", "bg-goto-green/5");
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("border-goto-green", "bg-goto-green/5");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-goto-green", "bg-goto-green/5");
                        const f = e.dataTransfer.files[0];
                        if (f) handleFile(f);
                      }}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={40} className="mb-3 animate-spin text-goto-green" />
                          <p className="text-sm text-txt-secondary">Mengupload & mengompresi...</p>
                        </>
                      ) : (
                        <>
                          <ImagePlus size={40} className="mb-3 text-txt-muted" />
                          <p className="text-sm font-medium text-txt-primary">
                            Klik atau drag gambar ke sini
                          </p>
                          <p className="mt-1 text-xs text-txt-muted">
                            JPEG, PNG, WebP — Maks 10MB (otomatis dikompres)
                          </p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full max-h-64 rounded-xl bg-surface-secondary object-contain"
                      />
                      <button
                        onClick={() => {
                          setPreviewUrl("");
                          setSelectedUrl("");
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Media Library Tab ── */}
              {activeTab === "library" && (
                <div>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                    <input
                      value={mediaSearch}
                      onChange={(e) => setMediaSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") fetchMedia(1, false, mediaSearch); }}
                      placeholder="Cari gambar berdasarkan caption, sumber, atau nama file..."
                      className="input w-full pl-9 pr-16 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => fetchMedia(1, false, mediaSearch)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-goto-green px-3 py-1 text-xs font-medium text-white hover:bg-goto-green-dark"
                    >
                      Cari
                    </button>
                  </div>
                  {loadingMedia ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={32} className="animate-spin text-goto-green" />
                    </div>
                  ) : mediaList.length === 0 ? (
                    <div className="py-12 text-center">
                      <Images size={40} className="mx-auto mb-3 text-txt-muted" />
                      <p className="text-sm text-txt-muted">
                        Belum ada gambar di media library.
                      </p>
                      <button
                        onClick={() => setActiveTab("upload")}
                        className="mt-3 text-sm font-medium text-goto-green hover:underline"
                      >
                        Upload gambar baru
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-[420px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {mediaList
                        .filter((m) => m.type?.startsWith("image"))
                        .map((m) => (
                          <div
                            key={m.id}
                            className={cn(
                              "group overflow-hidden rounded-xl border-2 bg-surface transition-all",
                              selectedUrl === m.url
                                ? "border-goto-green ring-2 ring-goto-green/20"
                                : "border-border hover:border-goto-green/40"
                            )}
                          >
                            {/* Thumbnail — click to select */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUrl(m.url);
                                setPreviewUrl(m.url);
                                if (m.caption) setCaption(m.caption);
                                if (m.source) setSource(m.source);
                              }}
                              className="relative block w-full aspect-square overflow-hidden"
                            >
                              <img src={m.url} alt={m.caption || m.filename} className="h-full w-full object-cover" />
                              {selectedUrl === m.url && (
                                <div className="absolute inset-0 flex items-center justify-center bg-goto-green/20">
                                  <Check size={24} className="text-white drop-shadow-md" />
                                </div>
                              )}
                            </button>

                            {/* Info + Actions */}
                            <div className="p-2">
                              <p className="truncate text-xs font-medium text-txt-primary" title={m.caption || m.filename}>
                                {m.caption || m.filename}
                              </p>
                              {m.source && (
                                <p className="truncate text-[11px] text-txt-muted">{m.source}</p>
                              )}
                              {m.usedIn && m.usedIn.length > 0 && (
                                <p className="mt-0.5 truncate text-[10px] text-blue-500" title={m.usedIn.join(", ")}>
                                  Dipakai di {m.usedIn.length} artikel
                                </p>
                              )}
                              <div className="mt-1.5 flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingMedia(m)}
                                  title="Lihat"
                                  className="rounded-md p-1 text-txt-muted hover:bg-surface-secondary hover:text-blue-500"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingMedia(m); setEditCaption(m.caption || ""); setEditSource(m.source || ""); }}
                                  title="Edit Caption"
                                  className="rounded-md p-1 text-txt-muted hover:bg-surface-secondary hover:text-goto-green"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteMedia(m)}
                                  title="Hapus"
                                  className="rounded-md p-1 text-txt-muted hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    {hasMoreMedia && (
                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={() => fetchMedia(mediaPage + 1, true, mediaSearch)}
                          disabled={loadingMore}
                          className="rounded-full border border-border px-5 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary disabled:opacity-50"
                        >
                          {loadingMore ? "Memuat..." : "Muat Lebih Banyak"}
                        </button>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Caption & Source (when image is selected) ── */}
              {selectedUrl && (
                <div className="mt-5 space-y-3 border-t border-border pt-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-txt-primary">
                      Judul / Caption Gambar
                    </label>
                    <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Contoh: Suasana sidang di PN Bandung"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-txt-primary">
                      Sumber Gambar
                    </label>
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="Contoh: Dok. JHB / Nama Fotografer"
                      className="input w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary"
              >
                Batal
              </button>
              <button
                onClick={insertImage}
                disabled={!selectedUrl}
                className="rounded-full bg-goto-green px-5 py-2 text-sm font-medium text-white hover:bg-goto-green-dark disabled:opacity-40"
              >
                Sisipkan Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Lightbox ── */}
      {viewingMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setViewingMedia(null)}>
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewingMedia(null)} className="absolute -right-2 -top-2 z-10 rounded-full bg-black/70 p-1.5 text-white hover:bg-black">
              <X size={18} />
            </button>
            <img src={viewingMedia.url} alt={viewingMedia.caption || ""} className="max-h-[80vh] rounded-xl object-contain" />
            <div className="mt-3 text-center">
              {viewingMedia.caption && <p className="text-sm font-medium text-white">{viewingMedia.caption}</p>}
              {viewingMedia.source && <p className="text-xs text-white/60">{viewingMedia.source}</p>}
              {viewingMedia.usedIn && viewingMedia.usedIn.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-white/40">Dipakai di:</p>
                  {viewingMedia.usedIn.map((title, i) => (
                    <p key={i} className="text-xs text-blue-300">{title}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Caption/Source Overlay ── */}
      {editingMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingMedia(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-4 text-base font-bold text-txt-primary">Edit Info Gambar</h4>
            <div className="mb-3 flex justify-center">
              <img src={editingMedia.url} alt="" className="max-h-32 rounded-lg object-contain" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-txt-primary">Caption</label>
                <input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} className="input w-full" placeholder="Judul / keterangan gambar" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-txt-primary">Sumber</label>
                <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="input w-full" placeholder="Dok. JHB / Nama Fotografer" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditingMedia(null)} className="rounded-full border border-border px-4 py-2 text-sm text-txt-secondary hover:bg-surface-secondary">Batal</button>
              <button onClick={saveMediaEdit} disabled={savingEdit} className="rounded-full bg-goto-green px-5 py-2 text-sm font-medium text-white hover:bg-goto-green-dark disabled:opacity-50">
                {savingEdit ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
