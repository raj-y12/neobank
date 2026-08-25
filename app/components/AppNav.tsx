"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview", icon: "⌂" },
  { href: "/account", label: "Account", icon: "◉" },
  { href: "/onboarding", label: "KYC / KYB", icon: "✓" },
  { href: "/funding", label: "Linked bank", icon: "↓" },
  { href: "/cards", label: "Cards", icon: "card" },
  { href: "/payments", label: "Payments", icon: "$" },
  { href: "/approvals", label: "Approvals", icon: "✓" },
  { href: "/reconciliation", label: "Reconciliation", icon: "≡" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="brand-mark" aria-label="Corgi home">c</div>

      <nav className="nav-tabs" aria-label="Primary">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-tab${pathname === tab.href || (tab.href === "/cards" && pathname.startsWith("/cards/")) ? " is-active" : ""}`}
          >
            {tab.icon === "card" ? <span className="nav-tab-card-chip" aria-hidden="true" /> : <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-spacer" />
      <div className="avatar">JR</div>
    </header>
  );
}
