"use client";

import { useState, useEffect, useRef } from "react";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionAccount } from "@/lib/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  account: SessionAccount | null;
  children: ReactNode;
}

export function AppShell({ account, children }: AppShellProps) {
  const pathname = usePathname() || "";
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const drawerWasOpen = useRef(false);

  const role = account?.role || "GUEST";
  const isAdmin = role === "ADMIN";
  const isStaff = role === "STAFF";
  const isAdminView = isAdmin && pathname.startsWith("/admin");
  const isStaffView = (isStaff || isAdmin) && pathname.startsWith("/staff");

  // Manage body scroll when drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  // Keep keyboard focus within the open drawer and return it to the menu button.
  useEffect(() => {
    if (!mobileDrawerOpen) {
      if (drawerWasOpen.current) {
        mobileMenuButtonRef.current?.focus();
        drawerWasOpen.current = false;
      }
      return;
    }

    drawerWasOpen.current = true;
    const focusableElements =
      mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
    const firstFocusable = focusableElements?.[0];
    const lastFocusable = focusableElements?.[focusableElements.length - 1];
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileDrawerOpen(false);
      } else if (event.key === "Tab" && firstFocusable && lastFocusable) {
        if (event.shiftKey && document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  // Determine active link helper
  const isLinkActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // 1. Traveler Navigation (Requirements 34)
  const travelerSections = [
    {
      title: "TRAVEL",
      items: [
        {
          href: "/",
          label: "Home",
          exact: true,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          href: "/trips",
          label: "Find Transport",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          href: "/bookings",
          label: "My Trips & Tickets",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
        },
        {
          href: "/demand",
          label: "Travel Requests",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        {
          href: "/notifications",
          label: "Notifications",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ),
        },
        {
          href: "/profile",
          label: "Profile",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
        {
          href: "/help",
          label: "Help",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  // 2. Staff Navigation (Requirements 35)
  const staffSections = [
    {
      title: "OPERATIONS",
      items: [
        {
          href: "/staff",
          label: "Departures",
          exact: true,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          href: "/staff/search",
          label: "Passenger Search",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          href: "/staff/history",
          label: "Check-in History",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
      ],
    },
  ];

  // 3. Admin Navigation (Requirements 36)
  const adminSections = [
    {
      title: "OVERVIEW",
      items: [
        {
          href: "/admin",
          label: "Overview",
          exact: true,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "TRANSPORT",
      items: [
        {
          href: "/admin/trips",
          label: "Trips & Departures",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          href: "/admin/vehicles",
          label: "Fleet",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          ),
        },
        {
          href: "/admin/routes",
          label: "Routes & Locations",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          ),
        },
        {
          href: "/admin/events",
          label: "Events",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        {
          href: "/admin/bookings",
          label: "Bookings",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
        },
        {
          href: "/admin/payments",
          label: "Payments",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          href: "/admin/demand",
          label: "Demand",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        {
          href: "/admin/accounts",
          label: "Users",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          href: "/admin/reports",
          label: "Reports",
          exact: false,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
      ],
    },
  ];

  // Pick current active navigation sections
  const currentSections = isAdminView
    ? adminSections
    : isStaffView
    ? staffSections
    : travelerSections;

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#102A43] flex flex-col font-sans antialiased">
      {/* Mobile Top Header */}
      <header className="lg:hidden border-b border-[#D8E5F2] bg-[#F4F8FC] sticky top-0 z-40">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="min-h-11 min-w-11 rounded-lg text-[#23384D] hover:text-[#102A43] hover:bg-[#E7F0FA] focus:outline-none focus:ring-2 focus:ring-brand-green/20 cursor-pointer"
              aria-label="Open navigation"
              aria-expanded={mobileDrawerOpen}
              aria-controls="mobile-navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="inline-block" aria-label="Haramaya Trip home">
              <BrandLogo size={30} />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {account ? (
              <Link href="/profile" className="text-right">
                <span className="text-xs font-bold text-[#171717] block max-w-[120px] truncate leading-tight">
                  {account.fullName.split(" ")[0]}
                </span>
                <span className="text-[10px] text-brand-green font-semibold uppercase block">
                  {account.role}
                </span>
              </Link>
            ) : (
              <Button size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop fixed sidebar */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-30 border-r border-[#D8E5F2] bg-[#F4F8FC] text-[#102A43]"
      >
        {/* Brand Section at Top */}
        <div
          className="h-16 px-4 flex items-center border-b border-[#D8E5F2]"
        >
          <Link href={isAdminView ? "/admin" : isStaffView ? "/staff" : "/"} className="inline-block">
            <BrandLogo
              size={38}
              subtitle={
                isAdminView
                  ? "Administration"
                  : isStaffView
                  ? "Staff Operations"
                  : "University Transit"
              }
            />
          </Link>
        </div>

        {/* Section Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {currentSections.map((section) => (
            <div key={section.title}>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider text-[#647A91] px-3 mb-1"
              >
                {section.title}
              </div>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isLinkActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-lg transition-colors border-l-2 ${
                        active
                          ? "border-brand-green bg-white text-[#064E3B] font-semibold"
                          : "border-transparent text-[#344B63] hover:bg-[#E7F0FA] hover:text-[#102A43] font-medium"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={active ? "text-brand-green" : "text-current"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Role Switching Quick Links for Multi-Role Accounts */}
          {isAdmin && (
            <div className="pt-2 border-t border-[#D8E5F2]">
              <div className="text-[10px] font-semibold text-[#647A91] uppercase tracking-wider px-3 mb-1">
                SWITCH VIEW
              </div>
              <div className="space-y-0.5">
                {isAdminView ? (
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#344B63] hover:text-[#102A43] hover:bg-[#E7F0FA] rounded-lg transition-colors"
                  >
                    <span>← Passenger Site</span>
                  </Link>
                ) : (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-brand-green bg-white font-semibold rounded-lg hover:bg-[#E7F0FA] transition-colors"
                  >
                    <span>Admin Console →</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: User Identity & Session */}
        <div
          className="p-3 border-t border-[#D8E5F2] bg-[#EDF4FB]"
        >
          {account ? (
            <div className="space-y-2.5">
              <Link href="/profile" className="flex items-center justify-between group">
                <div className="flex-1 min-w-0 pr-2">
                  <div
                    className="text-xs font-semibold truncate group-hover:underline text-[#102A43]"
                  >
                    {account.fullName}
                  </div>
                  <div
                    className="text-[10px] uppercase font-semibold text-brand-green"
                  >
                    {account.role}
                  </div>
                </div>
                <span className="text-xs text-[#87918B] group-hover:text-current">↗</span>
              </Link>
              <form action={logoutAction}>
                <Button variant="danger" size="sm" fullWidth type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="neutral" size="sm" fullWidth asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="secondary" size="sm" fullWidth asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (Accessible Off-Canvas Menu) */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div
            ref={mobileDrawerRef}
            id="mobile-navigation"
            className="relative w-72 max-w-[85vw] bg-[#F4F8FC] h-full shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#D8E5F2] flex items-center justify-between bg-[#EDF4FB]">
              <BrandLogo size={36} subtitle={isAdminView ? "Admin" : isStaffView ? "Staff" : "Traveler"} />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#66706A] hover:text-[#0A0A0A] hover:bg-[#E3E8E5] cursor-pointer"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {currentSections.map((section) => (
                <div key={section.title}>
                  <div className="text-[10px] font-semibold text-[#647A91] uppercase tracking-wider mb-1 px-2">
                    {section.title}
                  </div>
                  <nav className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isLinkActive(item.href, item.exact);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex min-h-11 items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg font-medium transition-colors border-l-2 ${
                            active
                              ? "border-brand-green bg-white text-[#064E3B] font-semibold"
                              : "border-transparent text-[#344B63] hover:bg-[#E7F0FA] hover:text-[#102A43]"
                          }`}
                          aria-current={active ? "page" : undefined}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}

              {isAdmin && (
                <div className="pt-3 border-t border-[#E3E8E5]">
                  <div className="text-[10px] font-bold text-[#87918B] uppercase tracking-wider px-2 mb-1">
                    SWITCH VIEW
                  </div>
                  {isAdminView ? (
                    <Link
                      href="/"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 text-xs font-semibold text-[#66706A] hover:text-[#0A0A0A] rounded-lg"
                    >
                      ← Passenger Site
                    </Link>
                  ) : (
                    <Link
                      href="/admin"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 text-xs font-bold text-brand-green bg-[#ECFDF5] rounded-lg"
                    >
                      Admin Console →
                    </Link>
                  )}
                </div>
              )}

              {/* Session controls follow navigation instead of pinning to the drawer bottom. */}
              <div className="mt-4 border-t border-[#D8E5F2] pt-3">
                {account ? (
                  <div className="space-y-2">
                    <div className="text-xs">
                      <div className="truncate font-bold text-[#0A0A0A]">{account.fullName}</div>
                      <div className="text-[10px] text-brand-green font-semibold uppercase">{account.role}</div>
                    </div>
                    <form action={logoutAction}>
                      <Button variant="danger" size="sm" fullWidth type="submit">
                        Sign out
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="neutral" size="sm" fullWidth asChild>
                      <Link href="/login" onClick={() => setMobileDrawerOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" fullWidth asChild>
                      <Link href="/register" onClick={() => setMobileDrawerOpen(false)}>
                        Register
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area (Fixed Sidebar Offset on Desktop) */}
      <main className="flex-1 min-w-0 lg:pl-60 pb-8">
        <div
          className={`mx-auto ${
            isAdminView
              ? "max-w-7xl px-4 sm:px-6 py-6 sm:py-8"
              : "max-w-5xl px-4 py-6 md:px-6 md:py-8"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
