"use client";

import { useState } from "react";
import { IconChevronRight, IconLogOut } from "../components/Icon";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <form action="/auth/signout" method="post" onSubmit={() => setPending(true)}>
      <button className="settings-row settings-button settings-button-danger" type="submit" disabled={pending} aria-busy={pending}>
        <span className="settings-icon settings-icon-danger"><IconLogOut /></span>
        <span className="settings-copy"><strong>{pending ? "Signing out…" : "Sign out"}</strong><small>{pending ? "Ending this session" : "End this session"}</small></span>
        <span className="settings-action-icon" aria-hidden="true"><IconChevronRight /></span>
      </button>
    </form>
  );
}
