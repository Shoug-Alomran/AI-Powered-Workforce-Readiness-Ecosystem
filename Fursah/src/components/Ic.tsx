import type { ReactNode } from "react";

/* Inline icon set. These replace decorative unicode glyphs (♙ ◷ ⌕ ▣ …) that
   render inconsistently — or as the wrong picture entirely — across fonts and
   platforms. Every icon is a 24x24 stroked path that inherits currentColor. */
const paths: Record<string, ReactNode> = {
  award: (
    <>
      <circle cx="12" cy="8.5" r="5" />
      <path d="m8.6 12.7-1.1 8 4.5-2.4 4.5 2.4-1.1-8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.2 1.9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  spark: <path fill="currentColor" stroke="none" d="m12 2.6 2.1 6 6 2.1-6 2.1-2.1 6-2.1-6-6-2.1 6-2.1z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5.1" />
      <path d="M12 7.7h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.6 4.6L19 7.4" />,
  save: (
    <>
      <path d="M5 4.5h11L19.5 8v11.5h-15z" />
      <path d="M8.5 4.5v5h7M8 19.5v-5h8v5" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19 6v5.6c0 4.2-2.8 7.4-7 9.2-4.2-1.8-7-5-7-9.2V6z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.8 20c.6-3.4 3.1-5.3 6.2-5.3s5.6 1.9 6.2 5.3" />
      <path d="M16.2 5.4a3.5 3.5 0 0 1 0 6.6M17 14.9c2.3.5 3.8 2.3 4.2 5.1" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 17V12M12.5 17V8M17 17v-6.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  list: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h11" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20H4z" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8.5h13l-3-3M20 15.5H7l3 3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6z" />
      <path d="M14 3.5v4h4M9 12.5h6M9 16h4" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a3.6 3.6 0 0 0 5.2.3l2.6-2.6a3.7 3.7 0 0 0-5.2-5.2l-1.5 1.5" />
      <path d="M14 10.5a3.6 3.6 0 0 0-5.2-.3L6.2 12.8a3.7 3.7 0 0 0 5.2 5.2l1.5-1.5" />
    </>
  ),
};

export type IcName = keyof typeof paths;

export default function Ic({ name, className }: { name: IcName; className?: string }) {
  return (
    <svg className={className ? `ic ${className}` : "ic"} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
