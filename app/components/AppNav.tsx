"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/browser";
import { shouldShowAppNavigation } from "@/src/domain/navigation-gate";
import { navigationForRole } from "@/src/domain/access-policy";
import type { MembershipRole } from "@/src/domain/auth";
import { BrandMark } from "./BrandMark";
import { IconCheckCircle, IconDollar, IconHome, IconReceipt, IconUsers } from "./Icon";

const ICONS = { "/": <IconHome />, "/cards": "card" as const, "/team": <IconUsers />, "/payments": <IconDollar />, "/approvals": <IconCheckCircle />, "/reconciliation": <IconReceipt /> };

export function AppNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const isPublicPath = pathname === "/login" || pathname === "/onboarding";
  const [showNavigation, setShowNavigation] = useState(!isPublicPath);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    let disposed = false;
    const loadStatus = async () => {
      const { data } = await client.auth.getUser();
      const nextEmail = data.user?.email ?? null;
      if (disposed) return;
      setEmail(nextEmail);
      if (!nextEmail || isPublicPath) {
        setOwnerName(null);
        setShowNavigation(false);
        return;
      }
      const statusResponse = await fetch("/api/navigation-status", { cache: "no-store" });
      const status = statusResponse.ok ? await statusResponse.json() as { ownerName?: string | null; role?: MembershipRole } : null;
      setOwnerName(status?.ownerName ?? null);
      setRole(status?.role ?? null);
      setShowNavigation(shouldShowAppNavigation({ authenticated: true, onboardingApproved: true, fundingLinked: true, pathname }));
    };
    void loadStatus();
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      if (!session) {
        setOwnerName(null);
        setRole(null);
        setShowNavigation(false);
      }
      else void loadStatus();
    });
    window.addEventListener("focus", loadStatus);
    window.addEventListener("corgi:setup-changed", loadStatus);
    return () => {
      disposed = true;
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", loadStatus);
      window.removeEventListener("corgi:setup-changed", loadStatus);
    };
  }, [isPublicPath, pathname]);

  if (!showNavigation) return null;
  const tabs = role ? navigationForRole(role).map((tab) => ({ ...tab, icon: ICONS[tab.href as keyof typeof ICONS] })) : [];

  return (
    <header className="sidebar">
      <Link className="sidebar-brand" href="/" aria-label="Corgi home">
        <BrandMark />
        <span className="sidebar-brand-word">Corgi</span>
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname === tab.href || (tab.href === "/cards" && pathname.startsWith("/cards/")) ? "page" : undefined}
            className={`sidebar-tab${pathname === tab.href || (tab.href === "/cards" && pathname.startsWith("/cards/")) ? " is-active" : ""}`}
          >
            {tab.icon === "card" ? <span className="sidebar-tab-card-chip" aria-hidden="true" /> : <span className="sidebar-tab-icon" aria-hidden="true">{tab.icon}</span>}
            <span className="sidebar-tab-label">{tab.label}</span>
          </Link>
        ))}
      </nav>

      <Link className="nav-user" href="/account" aria-label="Open account profile">
        <div className="avatar">{(ownerName ?? email ?? "??").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
        <span className="nav-user-copy">
          <strong className="nav-user-name">{ownerName ?? email ?? "Account"}</strong>
          <span className="nav-user-email">{email}</span>
        </span>
      </Link>
    </header>
  );
}
