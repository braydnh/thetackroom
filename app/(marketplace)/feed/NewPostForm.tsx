"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/utils/images";

const TOPICS = [
  { value: "general",    label: "General" },
  { value: "tips",       label: "Tips & Advice" },
  { value: "show_off",   label: "Show Off Your Gear" },
  { value: "horse_care", label: "Horse Care" },
  { value: "ask",        label: "Ask the Community" },
];

interface NewPostFormProps {
  userId: string;
  onPost: (post: any) => void;
}

export function NewPostForm({ userId, onPost }: NewPostFormProps) {
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("general");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addImages(files: FileList | null) {
    if (!files) return;
    const remaining = 4 - images.length;
    const toAdd = Array.from(files).slice(0, remaining);
    setImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((prev) => [...prev, url]);
    });
  }

  function removeImage(i: number) {
    URL.revokeObjectURL(previews[i]);
    setImages((prev) => prev.filter((_, j) => j !== i));
    setPreviews((prev) => prev.filter((_, j) => j !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);

    try {
      const supabase = createClient();
      const imageUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const compressed = await compressImage(images[i]);
        const path = `${userId}/${Date.now()}-${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("feed-images")
          .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("feed-images").getPublicUrl(path);
        imageUrls.push(publicUrl);
      }

      const res = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), topic, image_urls: imageUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");

      onPost(data.post);
      setBody("");
      setTopic("general");
      setImages([]);
      setPreviews([]);
      toast.success("Post shared!");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-white p-4 mb-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share something with the community…"
        maxLength={2000}
        rows={3}
        className="w-full text-sm rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-olive/40 resize-none bg-cream/30"
      />

      {previews.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {previews.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-navy focus:outline-none focus:ring-1 focus:ring-olive/30"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {images.length < 4 && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-olive transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
              <span>Photo ({images.length}/4)</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addImages(e.target.files)}
            />
          </>
        )}

        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="ml-auto text-sm font-medium px-4 py-1.5 rounded-lg bg-olive text-cream disabled:opacity-50 hover:bg-olive/90 transition-colors flex items-center gap-1.5"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
