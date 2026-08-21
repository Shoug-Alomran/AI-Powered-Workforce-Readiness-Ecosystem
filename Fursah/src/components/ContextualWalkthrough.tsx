"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { chromeSteps, isPortalPath, tourForPath, type PortalRole, type Step } from "@/components/walkthroughSteps";

type Box = { top: number; left: number; width: number; height: number };
type SeenMap = Record<string, string>;

const STORE_KEY = "fursah_tour_v2";
const AUTO_KEY = "fursah_tour_auto";
const EVENT_NAME = "fursah-walkthrough-change";
const POP_WIDTH = 380;
const PAD = 8;
const NO_STEPS: Step[] = [];

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT_NAME, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(EVENT_NAME, listener);
  };
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable, the tour still works for this session */
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Resolve a step to a live element: CSS selector first, heading text as the fallback anchor. */
function resolveTarget(step: Step): HTMLElement | null {
  if (step.selector) {
    const bySelector = document.querySelector<HTMLElement>(step.selector);
    if (bySelector) return bySelector;
  }
  if (step.heading) {
    const wanted = step.heading.toLowerCase();
    const heading = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3")).find((node) =>
      (node.textContent || "").trim().toLowerCase().startsWith(wanted),
    );
    if (heading) return heading.closest<HTMLElement>("section,article,form,.card") ?? heading;
  }
  return null;
}

function sameBox(a: Box | null, b: Box) {
  if (!a) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export default function ContextualWalkthrough({ role }: { role: PortalRole }) {
  const pathname = usePathname() || "/";

  /* Preferences live in localStorage, so they are read as an external store rather than mirrored into state. */
  const seenRaw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORE_KEY) ?? "{}",
    () => "{}",
  );
  const autoRaw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(AUTO_KEY) ?? "on",
    () => "on",
  );
  const seen = useMemo<SeenMap>(() => {
    try {
      return JSON.parse(seenRaw) as SeenMap;
    } catch {
      return {};
    }
  }, [seenRaw]);
  const autoOpen = autoRaw !== "off";

  /* Everything below is keyed by pathname so a navigation resets the tour without an effect. */
  const [resolved, setResolved] = useState<{ path: string; steps: Step[] } | null>(null);
  const [progress, setProgress] = useState<{ path: string; index: number } | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [tracked, setTracked] = useState<{ key: string; box: Box } | null>(null);
  const [popHeight, setPopHeight] = useState(240);
  const popRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);

  const tour = useMemo(() => tourForPath(pathname), [pathname]);
  const chromeKey = `chrome:${role.toLowerCase()}`;
  const showChrome = isPortalPath(role, pathname) && !seen[chromeKey];

  const candidateSteps = useMemo<Step[]>(() => {
    if (!tour) return NO_STEPS;
    return showChrome ? [...chromeSteps[role], ...tour.steps] : tour.steps;
  }, [tour, showChrome, role]);

  /* Drop steps whose target is not on this page, so a tour never stalls on a dead anchor. */
  useEffect(() => {
    if (!candidateSteps.length) return;
    let cancelled = false;
    const resolve = (final: boolean) => {
      // Never re-cut the list mid-tour: that would shift the step the user is on.
      if (cancelled || openRef.current) return;
      const available = candidateSteps.filter(
        (step) => (!step.selector && !step.heading) || resolveTarget(step),
      );
      // Server-rendered sections can stream in after the page title. Publishing a
      // partial list would auto-open the tour and lock out the second anchor pass.
      // Open early only when every configured anchor is already present.
      if (!final && available.length !== candidateSteps.length) return;
      setResolved({
        path: pathname,
        steps: available,
      });
    };
    // Client components below the server shell need a frame or two to paint.
    const first = window.setTimeout(() => resolve(false), 120);
    const second = window.setTimeout(() => resolve(true), 600);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [candidateSteps, pathname]);

  const steps = resolved?.path === pathname ? resolved.steps : NO_STEPS;
  const tourKey = tour?.key ?? "";
  const unseen = Boolean(tourKey) && !seen[tourKey];
  const open = steps.length > 0 && (opened === pathname || (autoOpen && unseen));

  useEffect(() => {
    openRef.current = open;
  });

  const stepIndex = progress?.path === pathname ? progress.index : 0;
  const index = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const current = steps[index];
  const boxKey = `${pathname}|${index}`;
  const box = tracked?.key === boxKey ? tracked.box : null;

  const finish = useCallback(
    (mark: "completed" | "skipped") => {
      setOpened(null);
      setProgress(null);
      let stored: SeenMap = {};
      try {
        stored = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as SeenMap;
      } catch {
        stored = {};
      }
      const next: SeenMap = { ...stored, [tourKey]: mark };
      if (showChrome) next[chromeKey] = mark;
      writeStorage(STORE_KEY, JSON.stringify(next));
    },
    [tourKey, chromeKey, showChrome],
  );

  const next = useCallback(() => {
    if (index >= steps.length - 1) {
      finish("completed");
      return;
    }
    setProgress({ path: pathname, index: index + 1 });
  }, [index, steps.length, finish, pathname]);

  const back = useCallback(
    () => setProgress({ path: pathname, index: Math.max(0, index - 1) }),
    [index, pathname],
  );

  /* Track the target's position every frame so the spotlight follows scrolling and layout shifts. */
  useEffect(() => {
    if (!open || !current) return;
    const target = resolveTarget(current);
    if (!target) return;
    target.classList.add("walkthrough-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    let frame = 0;
    const track = () => {
      const rect = target.getBoundingClientRect();
      const measured = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      setTracked((previous) =>
        previous?.key === boxKey && sameBox(previous.box, measured) ? previous : { key: boxKey, box: measured },
      );
      frame = window.requestAnimationFrame(track);
    };
    frame = window.requestAnimationFrame(track);
    return () => {
      window.cancelAnimationFrame(frame);
      target.classList.remove("walkthrough-target");
    };
  }, [open, current, boxKey]);

  /* Interactive steps: doing the real thing on the page advances the tour. */
  useEffect(() => {
    const interact = current?.interact;
    if (!open || !current || !interact) return;
    const target = resolveTarget(current);
    if (!target) return;
    const handler = () => window.setTimeout(next, 260);
    target.addEventListener(interact.event, handler, true);
    return () => target.removeEventListener(interact.event, handler, true);
  }, [open, current, next]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const node = event.target as HTMLElement | null;
      const typing = !!node && (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) || node.isContentEditable);
      if (event.key === "Escape") {
        finish("skipped");
        return;
      }
      if (typing) return;
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    document.body.dataset.walkthrough = "open";
    return () => {
      window.removeEventListener("keydown", onKey);
      delete document.body.dataset.walkthrough;
    };
  }, [open, next, back, finish]);

  /* ResizeObserver fires on observe, so the first measurement arrives through the callback. */
  useEffect(() => {
    const element = popRef.current;
    if (!open || !element) return;
    const observer = new ResizeObserver(() => setPopHeight(element.offsetHeight || 240));
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  if (!tour || !steps.length) return null;

  if (!open) {
    return (
      <button
        type="button"
        className={`walkthrough-launcher${unseen ? " has-new" : ""}`}
        onClick={() => {
          setProgress({ path: pathname, index: 0 });
          setOpened(pathname);
        }}
        aria-label={`Start the guided walkthrough for ${tour.label}`}
      >
        <span aria-hidden="true">?</span>
        {unseen ? "Tour this page" : "Guided tour"}
      </button>
    );
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(POP_WIDTH, viewportWidth - 24);
  let popLeft = viewportWidth / 2 - width / 2;
  let popTop = viewportHeight / 2 - popHeight / 2;
  let arrow: "up" | "down" | null = null;

  if (box) {
    popLeft = Math.min(Math.max(12, box.left + box.width / 2 - width / 2), viewportWidth - width - 12);
    if (box.top + box.height + popHeight + 20 < viewportHeight) {
      popTop = box.top + box.height + 14;
      arrow = "up";
    } else if (box.top - popHeight - 20 > 0) {
      popTop = box.top - popHeight - 14;
      arrow = "down";
    } else {
      popTop = Math.max(12, viewportHeight - popHeight - 16);
    }
  }

  const last = index === steps.length - 1;

  return (
    <>
      {box && (
        <div
          className="walkthrough-spot"
          aria-hidden="true"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      )}
      <aside
        ref={popRef}
        className={`walkthrough-panel${arrow ? ` arrow-${arrow}` : ""}`}
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={`Guided walkthrough: ${tour.label}`}
        style={{ top: popTop, left: popLeft, width }}
      >
        <div className="walkthrough-progress">
          <span>{tour.label.toUpperCase()}</span>
          <b>
            {index + 1} / {steps.length}
          </b>
        </div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        {current.interact && (
          <p className="walkthrough-hint">
            <i aria-hidden="true">➜</i>
            {current.interact.hint}
          </p>
        )}
        <div className="walkthrough-dots" aria-hidden="true">
          {steps.map((_, dot) => (
            <i className={dot === index ? "active" : dot < index ? "done" : ""} key={dot} />
          ))}
        </div>
        <footer>
          <button type="button" className="walkthrough-skip" onClick={() => finish("skipped")}>
            Skip tour
          </button>
          <span>
            {index > 0 && (
              <button type="button" onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="walkthrough-next" onClick={next}>
              {last ? "Finish" : "Next"}
            </button>
          </span>
        </footer>
        <button
          type="button"
          className="walkthrough-auto"
          onClick={() => {
            // Keep this tour on screen; the preference only governs future pages.
            setOpened(pathname);
            writeStorage(AUTO_KEY, autoOpen ? "off" : "on");
          }}
        >
          {autoOpen ? "Stop opening tours automatically" : "Open page tours automatically"}
        </button>
      </aside>
    </>
  );
}
