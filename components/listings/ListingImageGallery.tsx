"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingImageGalleryProps {
  images: string[];
  title: string;
}

export function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const prev = useCallback(() => { setActive((a) => (a - 1 + images.length) % images.length); setZoomed(false); }, [images.length]);
  const next = useCallback(() => { setActive((a) => (a + 1) % images.length); setZoomed(false); }, [images.length]);
  const closeLightbox = useCallback(() => { setLightbox(false); setZoomed(false); }, []);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, closeLightbox, prev, next]);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
        <span className="text-6xl opacity-20">🐴</span>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-zoom-in"
        onClick={() => setLightbox(true)}
      >
        <Image
          src={images[active]}
          alt={`${title} — image ${active + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {/* Zoom hint */}
        <div className="absolute top-3 right-3 rounded-full bg-black/30 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-4 w-4 text-white" />
        </div>
        {/* Nav arrows for mobile */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow backdrop-blur-sm hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow backdrop-blur-sm hover:bg-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {/* Dot indicator for mobile */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-4 bg-white" : "w-1.5 bg-white/60"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="hidden md:flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors",
                i === active ? "border-olive" : "border-transparent"
              )}
            >
              <Image src={img} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Lightbox */}
    {lightbox && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        onClick={closeLightbox}
      >
        {/* Image — z-0 so buttons layer above it */}
        <div
          className="relative w-full h-full max-w-5xl max-h-[90vh] mx-4 z-0 overflow-hidden"
          onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
        >
          <Image
            src={images[active]}
            alt={`${title} — image ${active + 1}`}
            fill
            sizes="100vw"
            className={cn(
              "object-contain transition-transform duration-200 select-none",
              zoomed ? "scale-[2.5] cursor-zoom-out" : "cursor-zoom-in"
            )}
            priority
          />
        </div>

        {/* Close — z-10 ensures it renders above the image stacking context */}
        <button
          className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Arrows */}
        {images.length > 1 && !zoomed && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Counter / zoom hint */}
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex gap-2">
          {images.length > 1 && (
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {active + 1} / {images.length}
            </span>
          )}
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {zoomed ? "Click to zoom out" : "Click to zoom in"}
          </span>
        </div>
      </div>
    )}
    </>
  );
}
