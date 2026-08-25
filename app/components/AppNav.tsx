"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/cards", label: "Cards" },
  { href: "/approvals", label: "Approvals" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/statements", label: "Statements" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="topbar">
        <div className="brand-mark">c</div>
        <div>
          <p className="eyebrow">Corgi business banking</p>
          <h1>Operating account</h1>
        </div>
        <div className="topbar-spacer" />
        <span className="pill pill-orange">Sandbox</span>
        <div className="avatar">JR</div>
      </header>
      <nav className="nav-tabs" aria-label="Primary">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-tab${pathname === tab.href ? " is-active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
