"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  currentImage?: string;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ImageUploader({ onUpload, currentImage }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>(currentImage || "");
  const [sizeInfo, setSizeInfo] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setSizeInfo("");

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPEG, PNG, atau WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File terlalu besar (maks 10MB sebelum kompres)");
      return;
    }

    setUploading(true);
    try {
      const originalSize = file.size;
      const compressed = await compressImage(file);
      const compressedSize = compressed.size;

      setSizeInfo(
        `${formatSize(originalSize)} → ${formatSize(compressedSize)} (${Math.round(
          (1 - compressedSize / originalSize) * 100
        )}% lebih kecil)`
      );

      if (compressedSize > 2 * 1024 * 1024) {
        setError("Gambar masih terlalu besar setelah kompres. Gunakan gambar yang lebih kecil.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", compressed, file.name.replace(/\.[^.]+$/, ".webp"));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Gagal mengupload gambar");
        setUploading(false);
        return;
      }

      setPreview(data.data.url);
      onUpload(data.data.url);
    } catch {
      setError("Terjadi kesalahan saat mengupload gambar");
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const removeImage = () => {
    setPreview("");
    setSizeInfo("");
    onUpload("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-[8px] object-cover"
            style={{ maxHeight: 200, minHeight: 80, width: "100%" }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.minHeight = "80px";
              el.style.background = "#f7f7f8";
              el.alt = "Gambar tidak dapat ditampilkan";
            }}
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed p-6 transition-colors ${
            dragActive
              ? "border-goto-green bg-goto-green/5"
              : "border-border hover:border-goto-green/50"
          }`}
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-goto-green" />
          ) : (
            <ImageIcon size={24} className="text-txt-muted" />
          )}
          <p className="mt-2 text-center text-xs text-txt-secondary">
            {uploading ? "Mengupload..." : "Klik atau drag gambar ke sini"}
          </p>
          <p className="mt-1 text-center text-[10px] text-txt-muted">
            JPEG, PNG, WebP — Maks 2MB (otomatis dikompres)
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {sizeInfo && (
        <p className="text-[10px] text-goto-green">{sizeInfo}</p>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
