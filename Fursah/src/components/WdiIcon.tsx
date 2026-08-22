import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  employers: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  posting: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  model: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  report: (
    <>
      <path d="M5 21V4h9l1 2h4v9h-9l-1-2H5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </>
  ),
  certificate: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m8.5 13.5-1 7.5 4.5-2.5 4.5 2.5-1-7.5" />
    </>
  ),
};

export default function WdiIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="wdi-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
