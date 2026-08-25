"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview", icon: "⌂" },
  { href: "/cards", label: "Cards", icon: "card" },
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
            className={`nav-tab${pathname === tab.href ? " is-active" : ""}`}
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
