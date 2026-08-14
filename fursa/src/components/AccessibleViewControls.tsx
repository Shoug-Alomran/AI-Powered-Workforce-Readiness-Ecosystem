"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const destinations: Record<string, string> = {
  "view all intelligence": "/university/job-demand#skill-intelligence",
  "view all intelligence cards": "/university/job-demand#skill-intelligence",
  "view full analytics": "/university/analytics",
  "view proposal": "/university/actions",
  "view all certifications": "/university/curriculum#certification-mapping",
};

function normalizedLabel(element: Element) {
  return (element.textContent ?? "").replace(/\s+/g, " ").replace(/[→›]/g, "").trim().toLowerCase();
}

export default function AccessibleViewControls() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    document.querySelector<HTMLElement>(".wdi-skills")?.setAttribute("id", "skill-intelligence");
    document.querySelector<HTMLElement>(".cc-cert-section")?.setAttribute("id", "certification-mapping");

    const cleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>("a, button").forEach((element) => {
      const label = normalizedLabel(element);
      if (!/(^|\s)view(\s|$)/.test(label)) return;

      if (!element.getAttribute("aria-label")) {
        element.setAttribute("aria-label", element.textContent?.replace(/\s+/g, " ").trim() || "View details");
      }

      const destination = destinations[label];
      const isInactiveAnchor = element.tagName === "A" && !element.getAttribute("href");
      const isInactiveButton = element.tagName === "BUTTON" && destination;
      if (!destination || (!isInactiveAnchor && !isInactiveButton)) return;

      element.setAttribute("role", "link");
      element.setAttribute("tabindex", "0");
      const activate = (event: Event) => {
        event.preventDefault();
        router.push(destination);
      };
      const keydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") activate(event);
      };
      element.addEventListener("click", activate);
      element.addEventListener("keydown", keydown);
      cleanups.push(() => {
        element.removeEventListener("click", activate);
        element.removeEventListener("keydown", keydown);
      });
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [pathname, router]);

  return null;
}
