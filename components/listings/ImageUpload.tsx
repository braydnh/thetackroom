"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { X, Upload, GripVertical, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  id: string;
  preview: string;
  file?: File;
  url?: string; // already uploaded
}

interface ImageUploadProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUpload({ images, onChange, maxImages = 8, disabled }: ImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxImages - images.length;
      const toAdd = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining)
        .map((file) => ({
          id: `${Date.now()}-${Math.random()}`,
          preview: URL.createObjectURL(file),
          file,
        }));
      onChange([...images, ...toAdd]);
    },
    [images, maxImages, onChange]
  );

  const remove = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img?.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
    onChange(images.filter((i) => i.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // Reorder by drag
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("imageId", id);
  };

  const handleDropOnImage = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData("imageId");
    if (!sourceId || sourceId === targetId) { setDragOver(null); return; }
    const from = images.findIndex((i) => i.id === sourceId);
    const to = images.findIndex((i) => i.id === targetId);
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
    setDragOver(null);
  };

  const canAdd = images.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              draggable
              onDragStart={(e) => handleDragStart(e, img.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(img.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDropOnImage(e, img.id)}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-colors cursor-grab active:cursor-grabbing",
                dragOver === img.id ? "border-olive scale-95" : "border-transparent",
                i === 0 ? "col-span-2 row-span-2" : ""
              )}
            >
              <Image src={img.preview} alt={`Image ${i + 1}`} fill className="object-cover" sizes="200px" />
              {/* Primary badge */}
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-olive/90 px-2 py-0.5 text-[10px] font-medium text-cream">
                  Cover
                </span>
              )}
              {/* Drag handle */}
              <div className="absolute bottom-1 left-1 rounded bg-black/30 p-0.5 opacity-0 group-hover:opacity-100">
                <GripVertical className="h-3 w-3 text-white" />
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(img.id)}
                disabled={disabled}
                className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add more button */}
          {canAdd && (
            <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-olive hover:bg-olive/5 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
                disabled={disabled}
              />
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mt-1">Add</span>
            </label>
          )}
        </div>
      )}

      {/* Drop zone — shown when no images */}
      {images.length === 0 && (
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 px-6 cursor-pointer transition-colors",
            dragging ? "border-olive bg-olive/5" : "border-border hover:border-olive hover:bg-olive/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
            disabled={disabled}
          />
          <div className="rounded-full bg-olive/10 p-4">
            <Upload className="h-6 w-6 text-olive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-navy">
              Drag photos here or <span className="text-olive">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Up to {maxImages} photos · JPG, PNG, WebP
            </p>
          </div>
        </label>
      )}

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} photos · First photo is the cover · Drag to reorder
      </p>
    </div>
  );
}
