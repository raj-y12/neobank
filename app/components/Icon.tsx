type IconProps = { className?: string };

const base = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconArrowUp({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
}

export function IconArrowDown({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M12 5v14M5 12l7 7 7-7" /></svg>;
}

export function IconPlus({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>;
}

export function IconReceipt({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></svg>;
}

export function IconClock({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="8.25" /><path d="M12 7.5V12l3 2" /></svg>;
}

export function IconUndo({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M8 7 4 11l4 4" /><path d="M4 11h10a6 6 0 1 1 0 12h-1" /></svg>;
}

export function IconHome({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h5v-5h2v5h5v-9" /></svg>;
}

export function IconChevronLeft({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M15 5 8 12l7 7" /></svg>;
}

export function IconChevronRight({ className }: IconProps) {
  return <svg {...base} className={className}><path d="m9 5 7 7-7 7" /></svg>;
}

export function IconLogOut({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14" /><path d="M11 12h8M16 8l4 4-4 4" /></svg>;
}

export function IconClose({ className }: IconProps) {
  return <svg {...base} className={className}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function IconCheck({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M5 12.5 9.5 17 19 7" /></svg>;
}

export function IconCheckCircle({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="8.25" /><path d="M8.5 12.5 11 15l4.5-5.5" /></svg>;
}

export function IconUsers({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 6a3 3 0 0 1 0 5.9" /><path d="M17 13.3a5.5 5.5 0 0 1 3.5 5.2" /></svg>;
}

export function IconDollar({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M12 3v18" /><path d="M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" /></svg>;
}

export function IconCardStack({ className }: IconProps) {
  return <svg {...base} className={className}><rect x="3" y="6" width="15" height="11" rx="2.5" /><path d="M7 21h11a2.5 2.5 0 0 0 2.5-2.5V9" /></svg>;
}
