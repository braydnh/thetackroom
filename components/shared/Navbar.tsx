"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Menu, X, Search, Heart, MessageCircle, User, ChevronDown, ChevronRight, Plus, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "./Logo";

const shopSections = [
  {
    label: "For the Horse",
    href: "/listings?category=horse",
    items: [
      { label: "Shop All Horse", href: "/listings?category=horse" },
      { label: "Saddles", href: "/listings?category=horse&sub=saddles" },
      { label: "Girths", href: "/listings?category=horse&sub=girths" },
      { label: "Bridles & Accessories", href: "/listings?category=horse&sub=bridles" },
      { label: "Boots & Bandages", href: "/listings?category=horse&sub=boots-bandages" },
      { label: "Rugs", href: "/listings?category=horse&sub=rugs" },
      { label: "Lunging & Training", href: "/listings?category=horse&sub=lunging-training" },
    ],
  },
  {
    label: "For the Rider",
    href: "/listings?category=rider",
    items: [
      { label: "Shop All Rider", href: "/listings?category=rider" },
      { label: "Clothing", href: "/listings?category=rider&sub=clothing" },
      { label: "Footwear", href: "/listings?category=rider&sub=footwear" },
      { label: "Helmets & Safety", href: "/listings?category=rider&sub=helmets-safety" },
    ],
  },
  {
    label: "Sale & Deals",
    href: "/listings?category=sale",
    items: [
      { label: "Browse Sale & Deals", href: "/listings?category=sale" },
    ],
  },
];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

interface NavbarProps {
  user?: { username: string; avatar_url?: string | null; role?: string | null } | null;
  unreadMessages?: number;
  unreadNotifications?: number;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  type: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationBell({ unreadNotifications = 0 }: { unreadNotifications: number }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(unreadNotifications > 0);

  async function handleOpenChange(open: boolean) {
    if (!open) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
    if (hasUnread) {
      fetch("/api/notifications", { method: "PATCH" });
      setHasUnread(false);
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-navy uppercase tracking-wide">Notifications</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} asChild className={!n.read_at ? "bg-olive/5" : ""}>
                <Link href={n.link ?? "/"} className="flex flex-col gap-0.5 px-3 py-2 cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-navy leading-tight">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <span className="text-[11px] text-muted-foreground leading-snug">{n.body}</span>}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileShopSection({
  section,
  onClose,
}: {
  section: (typeof shopSections)[0];
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        className="w-full flex items-center justify-between rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light"
        onClick={() => setExpanded(!expanded)}
      >
        {section.label}
        <ChevronDown
          className={`h-4 w-4 opacity-70 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="pb-1">
          {section.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block rounded-md py-2.5 pl-8 pr-4 text-sm text-cream/70 hover:text-cream hover:bg-olive-light"
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ShopMegaMenu() {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted transition-colors">
        Shop
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 flex rounded-xl border border-border bg-white shadow-lg overflow-hidden z-50">
          {/* Left column — top-level categories */}
          <div className="w-44 border-r border-border py-2">
            {shopSections.map((section, i) => (
              <button
                key={section.label}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                  activeIdx === i ? "bg-muted text-navy" : "text-muted-foreground hover:bg-muted/50 hover:text-navy"
                }`}
              >
                {section.label}
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </button>
            ))}
          </div>

          {/* Right column — subcategories of active section */}
          <div className="w-52 py-2">
            {shopSections[activeIdx].items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-navy hover:bg-muted transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar({ user, unreadMessages = 0, unreadNotifications = 0 }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-olive p-0">
            <VisuallyHidden><SheetTitle>Navigation menu</SheetTitle></VisuallyHidden>
            <div className="flex items-center justify-between border-b border-olive-light px-6 py-5">
              <Logo variant="full" theme="dark" />
              <Button
                variant="ghost"
                size="icon"
                className="text-cream hover:bg-olive-light"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-0.5 p-4 overflow-y-auto h-full">
              {/* Main links */}
              <Link href="/" className="rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                Home
              </Link>

              {/* Shop — collapsible accordion sections */}
              {shopSections.map((section) => (
                <MobileShopSection key={section.label} section={section} onClose={() => setMobileOpen(false)} />
              ))}

              <Link href="/selling/listings/new" className="rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                Sell with Us
              </Link>
              <Link href="/about" className="rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                About
              </Link>
              <Link href="/contact" className="rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                Contact
              </Link>

              {/* Account section */}
              <div className="mt-auto pt-4 border-t border-olive-light">
                {user ? (
                  <>
                    <Link href={`/profile/${user.username}`} className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      My Profile
                    </Link>
                    <Link href="/orders" className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      My Orders
                    </Link>
                    <Link href="/messages" className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      Messages
                    </Link>
                    <Link href="/favourites" className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      Favourites
                    </Link>
                    <Link href="/settings" className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      Settings
                    </Link>
                    {user.role === "admin" && (
                      <Link href="/admin" className="block rounded-md px-4 py-3 text-sm font-medium text-cream/80 hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                        Admin Panel
                      </Link>
                    )}
                    <form action="/api/auth/signout" method="POST" className="mt-1">
                      <button type="submit" className="w-full text-left rounded-md px-4 py-3 text-sm font-medium text-red-300 hover:bg-olive-light">
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      Log in
                    </Link>
                    <Link href="/signup" className="block rounded-md px-4 py-3 text-sm font-medium text-cream hover:bg-olive-light" onClick={() => setMobileOpen(false)}>
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Logo variant="full" theme="light" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {/* Home */}
          <Link href="/" className="rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted transition-colors">
            Home
          </Link>

          {/* Shop mega-menu */}
          <ShopMegaMenu />

          {/* Sell with us */}
          <Link href="/selling/listings/new" className="rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted transition-colors">
            Sell with Us
          </Link>

          {/* About */}
          <Link href="/about" className="rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted transition-colors">
            About
          </Link>

          {/* Contact */}
          <Link href="/contact" className="rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted transition-colors">
            Contact
          </Link>
        </nav>

        {/* Right side icons */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/search">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          {user ? (
            <>
              {/* Favourites */}
              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
                <Link href="/favourites">
                  <Heart className="h-5 w-5" />
                  <span className="sr-only">Favourites</span>
                </Link>
              </Button>

              {/* Messages */}
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/messages">
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
                  )}
                  <span className="sr-only">Messages</span>
                </Link>
              </Button>

              {/* Notifications */}
              <NotificationBell unreadNotifications={unreadNotifications} />

              {/* Sell button */}
              <Button size="sm" className="hidden sm:inline-flex gap-1.5 bg-olive hover:bg-olive-light text-cream" asChild>
                <Link href="/selling/listings/new">
                  <Plus className="h-4 w-4" />
                  Sell
                </Link>
              </Button>

              {/* Account dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.username}`}>My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/selling">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/selling">Selling</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="text-olive font-medium">Admin Panel</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action="/api/auth/signout" method="POST">
                      <button type="submit" className="w-full text-left text-destructive">
                        Sign out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" className="bg-olive hover:bg-olive-light text-cream" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
