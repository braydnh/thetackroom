"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface ProfileResult {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function ListingsSearchBar({ defaultValue, large, placeholder }: { defaultValue?: string; large?: boolean; placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? "");
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch profile suggestions on keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setProfiles([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(5);
      setProfiles((data as ProfileResult[]) ?? []);
      setOpen(true);
      setActiveIdx(-1);
    }, 200);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function submitListingSearch(q?: string) {
    const term = (q ?? value).trim();
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  function goToProfile(username: string) {
    setOpen(false);
    setValue("");
    router.push(`/profile/${username}`);
  }

  function clear() {
    setValue("");
    setProfiles([]);
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  // Total dropdown items: profiles + 1 "search listings" row
  const totalItems = profiles.length + 1;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < profiles.length) {
        goToProfile(profiles[activeIdx].username);
      } else {
        submitListingSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={(e) => { e.preventDefault(); submitListingSearch(); }}>
        <Search className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10 ${large ? "left-4 h-5 w-5" : "left-3.5 h-4 w-4"}`} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim().length >= 2 && profiles.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Search listings or sellers…"}
          className={`w-full rounded-full border border-border bg-white text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive transition-colors ${large ? "pl-12 pr-28 py-3.5 text-sm shadow-sm focus:ring-cream/40" : "pl-10 pr-10 py-2.5 text-sm"}`}
        />
        {large ? (
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-olive-light px-5 py-2 text-sm font-medium text-cream hover:bg-olive transition-colors z-10"
          >
            Search
          </button>
        ) : value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy z-10"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-white shadow-lg overflow-hidden z-50">
          {/* Profile results */}
          {profiles.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sellers</p>
              </div>
              {profiles.map((p, i) => (
                <button
                  key={p.username}
                  type="button"
                  onMouseDown={() => goToProfile(p.username)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${activeIdx === i ? "bg-muted/50" : ""}`}
                >
                  <div className="relative h-7 w-7 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {p.avatar_url ? (
                      <Image src={p.avatar_url} alt={p.username} fill sizes="28px" className="object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground absolute inset-0 m-auto" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{p.display_name ?? p.username}</p>
                    <p className="text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                </button>
              ))}
              <div className="mx-3 border-t border-border" />
            </>
          )}

          {/* Search listings row */}
          <button
            type="button"
            onMouseDown={() => submitListingSearch()}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${activeIdx === profiles.length ? "bg-muted/50" : ""}`}
          >
            <div className="h-7 w-7 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0">
              <Search className="h-3.5 w-3.5 text-olive" />
            </div>
            <p className="text-sm text-navy">
              Search listings for <span className="font-semibold">"{value.trim()}"</span>
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
