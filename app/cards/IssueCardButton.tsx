"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function IssueCardButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function syncCards() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/cards/sync", { method: "POST" });
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to sync cards");
        router.refresh();
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync cards");
      }
    });
  }

  async function issueCard() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/cards", { method: "POST" });
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to issue card");
        router.refresh();
      } catch (issueError) {
        setError(issueError instanceof Error ? issueError.message : "Unable to issue card");
      }
    });
  }

  return <div className="action-stack">
    <button className="btn btn-secondary" onClick={syncCards} disabled={isPending}>{isPending ? "Syncing…" : "Sync existing cards"}</button>
    <button className="btn btn-primary" onClick={issueCard} disabled={isPending}>
      {isPending ? "Issuing…" : "Issue card"}
    </button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
