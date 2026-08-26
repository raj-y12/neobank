import Link from "next/link";
import { formatUsdCents, type LithicCard } from "@/src/integrations/lithic/client";

const THEMES = ["theme-orange", "theme-violet", "theme-teal", "theme-rose", "theme-azure", "theme-olive"];

function themeFor(token: string) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  return THEMES[hash % THEMES.length];
}

export function CardTile({ card, href, delegatedTo }: { card: LithicCard; href?: string; delegatedTo?: string | null }) {
  const isActive = card.state === "OPEN";
  const theme = themeFor(card.token);
  const content = (
    <>
      <div className="card-tile-top">
        <div className="card-chip" aria-hidden="true" />
        <span className={`chip chip-on-dark${isActive ? "" : " is-muted"}`}>{card.state}</span>
      </div>
      <p className="card-tile-number tabular">•••• •••• •••• {card.last_four}</p>
      <div className="card-tile-bottom">
        <div>
          <p className="card-tile-kind">{card.type} card</p>
          <p className="card-tile-brand">CORGI</p>
          <p className="card-tile-holder">{delegatedTo ? `Delegated to ${delegatedTo}` : "Unassigned"}</p>
        </div>
        <p className="card-tile-limit">
          Limit
          <strong>{formatUsdCents(card.spend_limit)} / {card.spend_limit_duration?.toLowerCase() ?? "—"}</strong>
        </p>
      </div>
    </>
  );

  const className = `card-tile ${theme}${isActive ? "" : " is-inactive"}`;
  const ariaLabel = `${card.type} card ending ${card.last_four}, ${card.state.toLowerCase()}, ${delegatedTo ? `delegated to ${delegatedTo}` : "unassigned"}`;
  return href ? <Link className={className} href={href} aria-label={ariaLabel}>{content}</Link> : <article className={className} aria-label={ariaLabel}>{content}</article>;
}
