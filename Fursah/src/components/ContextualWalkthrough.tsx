"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { chromeSteps, isPortalPath, tourForPath, type PortalRole, type Step } from "@/components/walkthroughSteps";

type Box = { top: number; left: number; width: number; height: number };
type SeenMap = Record<string, string>;
type Placement = "below" | "above" | "right" | "left" | "docked";

const STORE_KEY = "fursah_tour_v2";
const AUTO_KEY = "fursah_tour_auto";
const EVENT_NAME = "fursah-walkthrough-change";
const POP_WIDTH = 380;
const PAD = 8;
/** Clearance between the popover and the element it points at. */
const GAP = 14;
/** Distance kept from every viewport edge. */
const EDGE = 12;
/** How long the page is given to finish rendering before a partial tour opens. */
const SETTLE_MS = 700;
const NO_IDS: number[] = [];

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

/**
 * Resolve a step to a live element: CSS selector first, then section label text.
 * The label pass reads the eyebrow above a card as well as its heading, because
 * most sections in this app carry their name in the eyebrow.
 */
function resolveTarget(step: Step): HTMLElement | null {
  if (step.selector) {
    for (const candidate of document.querySelectorAll<HTMLElement>(step.selector)) {
      // Never anchor to the popover's own markup: it would chase itself.
      if (!candidate.closest(".walkthrough-panel")) return candidate;
    }
  }
  if (step.heading) {
    const wanted = step.heading.toLowerCase();
    const label = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,.eyebrow")).find(
      (node) =>
        !node.closest(".walkthrough-panel") &&
        (node.textContent || "").trim().toLowerCase().startsWith(wanted),
    );
    if (label) return label.closest<HTMLElement>("section,article,form,.card") ?? label;
  }
  return null;
}

function isAnchored(step: Step) {
  return Boolean(step.selector || step.heading);
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

/**
 * Bottom edge of whatever is pinned to the top of the page. Every portal has a
 * sticky header, and the popover has a higher stacking order than all of them,
 * so without this the panel simply covers the navigation it is describing.
 */
function safeTop() {
  let bottom = EDGE;
  for (const node of document.querySelectorAll<HTMLElement>("header,nav,[data-portal-header]")) {
    if (node.closest(".walkthrough-panel")) continue;
    const position = window.getComputedStyle(node).position;
    if (position !== "fixed" && position !== "sticky") continue;
    const rect = node.getBoundingClientRect();
    if (rect.height === 0 || rect.top > 4) continue;
    bottom = Math.max(bottom, rect.bottom + 8);
  }
  return bottom;
}

/** A detached, hidden, or scrolled-away element measures as an unusable rect. */
function usableBox(box: Box | null, top: number) {
  if (!box || box.width <= 1 || box.height <= 1) return false;
  return box.top < window.innerHeight - 4 && box.top + box.height > top;
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
  const [liveRaw, setLiveRaw] = useState<{ path: string; ids: number[] } | null>(null);
  const [settled, setSettled] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ path: string; id: number } | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [tracked, setTracked] = useState<{ id: number; box: Box } | null>(null);
  const [popHeight, setPopHeight] = useState(240);
  const [inset, setInset] = useState(EDGE);
  const popRef = useRef<HTMLElement | null>(null);
  const litRef = useRef<HTMLElement | null>(null);

  const tour = useMemo(() => tourForPath(pathname), [pathname]);
  const chromeKey = `chrome:${role.toLowerCase()}`;
  const showChrome = isPortalPath(role, pathname) && !seen[chromeKey];

  const candidateSteps = useMemo<Step[]>(() => {
    if (!tour) return [];
    return showChrome ? [...chromeSteps[role], ...tour.steps] : tour.steps;
  }, [tour, showChrome, role]);

  /*
   * Which steps can be shown right now. This is re-evaluated for the life of the
   * tour rather than cut once: server content, client widgets, and conditional
   * sections all appear at different moments, and a step whose section arrives
   * late should join the tour instead of being lost with it.
   */
  useEffect(() => {
    if (!candidateSteps.length) return;
    let last = 0;
    let timer = 0;
    const measure = () => {
      last = Date.now();
      const ids = candidateSteps.reduce<number[]>((keep, step, id) => {
        if (!isAnchored(step) || resolveTarget(step)) keep.push(id);
        return keep;
      }, []);
      setLiveRaw((previous) =>
        previous?.path === pathname && previous.ids.join() === ids.join() ? previous : { path: pathname, ids },
      );
    };
    // Coalesce bursts of DOM churn: a tour only needs to know within a frame or two.
    const schedule = () => {
      if (timer) return;
      const wait = Math.max(0, 200 - (Date.now() - last));
      timer = window.setTimeout(() => {
        timer = 0;
        measure();
      }, wait);
    };
    measure();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const settle = window.setTimeout(() => setSettled(pathname), SETTLE_MS);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.clearTimeout(settle);
      if (timer) window.clearTimeout(timer);
    };
  }, [candidateSteps, pathname]);

  const order = liveRaw?.path === pathname ? liveRaw.ids : NO_IDS;
  const tourKey = tour?.key ?? "";
  const unseen = Boolean(tourKey) && !seen[tourKey];
  // Auto-opening waits for a complete tour, or for the page to stop changing,
  // so a reader is never handed a two-step version of an eight-step page.
  const ready = order.length === candidateSteps.length || settled === pathname;
  const open = order.length > 0 && (opened === pathname || (autoOpen && unseen && ready));

  /* The position is held as a step id, so steps appearing or disappearing never shift the reader. */
  const wanted = progress?.path === pathname ? progress.id : (order[0] ?? -1);
  const exact = order.indexOf(wanted);
  // If the step the reader was on lost its section, fall forward to the next
  // one that still exists rather than jumping back to the start.
  const after = order.findIndex((step) => step >= wanted);
  const index = exact >= 0 ? exact : after >= 0 ? after : Math.max(0, order.length - 1);
  const id = order[index] ?? -1;
  const current = candidateSteps[id];
  const box = tracked?.id === id ? tracked.box : null;

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
    if (index >= order.length - 1) {
      finish("completed");
      return;
    }
    setProgress({ path: pathname, id: order[index + 1] });
  }, [index, order, finish, pathname]);

  const back = useCallback(
    () => setProgress({ path: pathname, id: order[Math.max(0, index - 1)] }),
    [index, order, pathname],
  );

  /*
   * Track the target every frame. The element is resolved inside the loop, not
   * captured once: streamed and re-rendered sections replace their nodes, and a
   * detached node reports a zero rect forever, which used to strand the popover
   * in the top-left corner of the screen.
   */
  useEffect(() => {
    if (!open || !current) return;
    let frame = 0;
    let scrolled = false;
    let tick = 0;
    let top = safeTop();
    const track = () => {
      const target = isAnchored(current) ? resolveTarget(current) : null;
      if (target !== litRef.current) {
        litRef.current?.classList.remove("walkthrough-target");
        target?.classList.add("walkthrough-target");
        litRef.current = target;
      }
      const rect = target?.getBoundingClientRect();
      const measured = rect
        ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        : null;
      // The header only moves when the layout does, so it is not worth a
      // forced style recalculation on every single frame.
      if (tick++ % 15 === 0) {
        top = safeTop();
        setInset((previous) => (Math.abs(previous - top) < 0.5 ? previous : top));
      }
      // Bring the section into view once. This has to happen while the target
      // is still off-screen, which is exactly when its box is not yet usable.
      if (target && measured && measured.width > 1 && measured.height > 1 && !scrolled) {
        scrolled = true;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTracked((previous) => {
        if (!measured || !usableBox(measured, top)) return previous?.id === id ? null : previous;
        return previous?.id === id && sameBox(previous.box, measured) ? previous : { id, box: measured };
      });
      frame = window.requestAnimationFrame(track);
    };
    frame = window.requestAnimationFrame(track);
    return () => {
      window.cancelAnimationFrame(frame);
      litRef.current?.classList.remove("walkthrough-target");
      litRef.current = null;
    };
  }, [open, current, id]);

  /*
   * Interactive steps: doing the real thing on the page advances the tour. The
   * listener sits on the document and re-resolves the target when the event
   * fires, so a section that re-renders between steps still counts.
   */
  useEffect(() => {
    const interact = current?.interact;
    if (!open || !current || !interact) return;
    const handler = (event: Event) => {
      const node = event.target as Node | null;
      const target = resolveTarget(current);
      if (!node || !target || !target.contains(node)) return;
      window.setTimeout(next, 260);
    };
    document.addEventListener(interact.event, handler, true);
    return () => document.removeEventListener(interact.event, handler, true);
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

  if (!tour || !order.length || !current) return null;

  if (!open) {
    return (
      <button
        type="button"
        className={`walkthrough-launcher${unseen ? " has-new" : ""}`}
        onClick={() => {
          setProgress({ path: pathname, id: order[0] });
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
  const width = Math.min(POP_WIDTH, viewportWidth - EDGE * 2);
  const clampLeft = (value: number) =>
    Math.min(Math.max(EDGE, value), Math.max(EDGE, viewportWidth - width - EDGE));
  const clampTop = (value: number) =>
    Math.min(Math.max(inset, value), Math.max(inset, viewportHeight - popHeight - EDGE));

  /*
   * Placement, in order of preference: under the target, over it, beside it,
   * and only then parked in the corner. Anything that would land on top of the
   * sticky header or off the viewport is rejected before it is chosen.
   */
  let placement: Placement = "docked";
  let popLeft = viewportWidth - width - EDGE;
  let popTop = viewportHeight - popHeight - EDGE;

  if (box) {
    const centred = clampLeft(box.left + box.width / 2 - width / 2);
    if (box.top + box.height + GAP + popHeight + EDGE <= viewportHeight) {
      placement = "below";
      popLeft = centred;
      popTop = box.top + box.height + GAP;
    } else if (box.top - GAP - popHeight >= inset) {
      placement = "above";
      popLeft = centred;
      popTop = box.top - GAP - popHeight;
    } else if (box.left + box.width + GAP + width + EDGE <= viewportWidth) {
      placement = "right";
      popLeft = box.left + box.width + GAP;
      popTop = clampTop(box.top + box.height / 2 - popHeight / 2);
    } else if (box.left - GAP - width >= EDGE) {
      placement = "left";
      popLeft = box.left - GAP - width;
      popTop = clampTop(box.top + box.height / 2 - popHeight / 2);
    }
  }

  const arrow = placement === "below" ? "up" : placement === "above" ? "down" : null;
  // Clamping moves the panel away from the target's centre, so the arrow is
  // placed against the target rather than at a fixed half of the panel.
  const arrowX = box ? Math.min(Math.max(18, box.left + box.width / 2 - popLeft), width - 18) : width / 2;
  const last = index === order.length - 1;

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
        className={`walkthrough-panel place-${placement}${arrow ? ` arrow-${arrow}` : ""}`}
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={`Guided walkthrough: ${tour.label}`}
        style={{ top: popTop, left: popLeft, width, ["--walkthrough-arrow" as string]: `${arrowX}px` }}
      >
        <div className="walkthrough-progress">
          <span>{tour.label.toUpperCase()}</span>
          <b>
            {index + 1} / {order.length}
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
          {order.map((dot, position) => (
            <i className={position === index ? "active" : position < index ? "done" : ""} key={dot} />
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
