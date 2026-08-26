import { describe, expect, it } from "vitest";
import { canAccessPage, navigationForRole } from "./access-policy";

describe("access policy", () => {
  it("allows members to use shared pages but not admin pages", () => {
    expect(canAccessPage("MEMBER", "/payments")).toBe(true);
    expect(canAccessPage("MEMBER", "/funding")).toBe(false);
    expect(canAccessPage("MEMBER", "/statements/card/tx-1")).toBe(false);
    expect(canAccessPage("MEMBER", "/reconciliation/break-1")).toBe(false);
    expect(canAccessPage("ADMIN", "/reconciliation")).toBe(true);
  });

  it("returns role-specific navigation", () => {
    expect(navigationForRole("MEMBER")).toEqual([
      { href: "/", label: "Overview" },
      { href: "/cards", label: "Cards" },
      { href: "/payments", label: "Send money" },
      { href: "/approvals", label: "My requests" },
    ]);
    expect(navigationForRole("ADMIN").map((item) => item.label)).toEqual([
      "Overview", "Cards", "Employees", "Payments", "Approvals", "Standing orders", "Reconciliation",
    ]);
  });

  it("keeps standing-order management admin-only", () => {
    expect(canAccessPage("ADMIN", "/standing-orders")).toBe(true);
    expect(canAccessPage("MEMBER", "/standing-orders")).toBe(false);
    expect(navigationForRole("MEMBER").some((item) => item.href === "/standing-orders")).toBe(false);
  });
});
