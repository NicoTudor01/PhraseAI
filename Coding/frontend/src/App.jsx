import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { validateRewriteResponse } from "./rewriteResponse";

// ARCHITECT: [RECOMMENDED PATTERN] Production uses the same-origin Vercel proxy, avoiding CORS as a rewrite dependency.
const API_URL = import.meta.env.DEV ? import.meta.env.VITE_API_URL || "/api" : "/api";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const AUTH_REDIRECT_ORIGIN = import.meta.env.VITE_AUTH_REDIRECT_URL || import.meta.env.VITE_PUBLIC_SITE_URL || "";
const PRODUCTION_AUTH_ORIGIN = "https://phraseai-nico.vercel.app";
const MAX_DRAFT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 8000;
const IS_DEV = import.meta.env.DEV;
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const API_TIMEOUT_MS = 65000;
// SCROLL-ANIM: Shared curves and timings keep the login choreography native to the existing UI.
const AUTH_EASE_OUT = [0.16, 1, 0.3, 1];
const AUTH_EASE_IN_OUT = [0.65, 0, 0.35, 1];
const AUTH_SCROLL_INPUT = [0, 620];
// SCROLL-ANIM: Normal flow moves at 1x; these transforms offset it to net 0.4x and 0.6x speeds.
const AUTH_BACKGROUND_SCROLL_OUTPUT = [0, 250];
const AUTH_CARDS_SCROLL_OUTPUT = [0, -145];
const AUTH_SCROLL_SPRING = { stiffness: 86, damping: 24, mass: 0.72, restDelta: 0.001 };
// SCROLL-ANIM: Main app uses a slightly softer spring so dashboard sections feel pulled rather than snapped.
const APP_SCROLL_SPRING = { stiffness: 72, damping: 26, mass: 0.85, restDelta: 0.001 };
const STYLE_SCROLL_INPUT = [0, 900];
const STYLE_HERO_Y_OUTPUT = [0, -72];
const STYLE_HERO_SCALE_OUTPUT = [1, 0.955];
const STYLE_HERO_OPACITY_OUTPUT = [1, 0.72];
const STYLE_MAP_Y_OUTPUT = [28, -34];
const STYLE_SIDE_Y_OUTPUT = [78, -18];
const STYLE_TIMELINE_Y_OUTPUT = [132, -10];
const STYLE_TRAITS_Y_OUTPUT = [190, 0];
const HISTORY_SCROLL_INPUT = [0, 760];
const HISTORY_HERO_Y_OUTPUT = [0, -58];
const HISTORY_HERO_SCALE_OUTPUT = [1, 0.97];
const HISTORY_TOOLBAR_Y_OUTPUT = [42, -12];
const HISTORY_FEED_Y_OUTPUT = [94, 0];
const APP_GLOBAL_SCROLL_INPUT = [0, 1400];
const APP_PLANE_Y_OUTPUT = [0, -46];
const APP_PLANE_SCALE_OUTPUT = [1, 0.986];
const APP_AMBIENT_Y_OUTPUT = [0, -210];
const APP_AMBIENT_ROTATE_OUTPUT = [-5, 9];
const APP_HEADER_Y_OUTPUT = [0, -9];
const APP_HEADER_OPACITY_OUTPUT = [1, 0.9];
const AUTH_PULL_SCROLL_INPUT = [0, 760];
const AUTH_HERO_SCALE_OUTPUT = [1, 0.9];
const AUTH_HERO_OPACITY_OUTPUT = [1, 0.3];
const AUTH_HERO_Y_OUTPUT = [0, -92];
const AUTH_DETAILS_PULL_OUTPUT = [180, 0];
const AUTH_DETAILS_SCALE_OUTPUT = [0.88, 1];
const AUTH_DETAILS_ROTATE_OUTPUT = [-3.5, 0];
const AUTH_SUCCESS_REDIRECT_MS = 980;
const AUTH_ERROR_DISMISS_MS = 4000;
const AUTH_BACKGROUND_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.8, ease: AUTH_EASE_OUT },
};
const AUTH_LEFT_SEQUENCE = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.18 } },
};
const AUTH_LEFT_ITEM = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: AUTH_EASE_OUT } },
};
const AUTH_PANEL_MOTION = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, delay: 0.2, ease: AUTH_EASE_OUT },
};
const AUTH_FORM_SEQUENCE = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.78 } },
};
const AUTH_FORM_ITEM = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: AUTH_EASE_OUT } },
};
const AUTH_BUTTON_ITEM = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: AUTH_EASE_OUT } },
};
const AUTH_FORM_REST = { x: 0, opacity: 1, y: 0 };
const AUTH_ERROR_SHAKE = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.4, ease: AUTH_EASE_IN_OUT },
};
const AUTH_ERROR_MOTION = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.3, ease: AUTH_EASE_OUT },
};
const AUTH_SUCCESS_EXIT = {
  opacity: 0,
  y: -10,
  transition: { duration: 0.5, delay: 0.45, ease: AUTH_EASE_IN_OUT },
};
const AUTH_STATE_SWAP = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: AUTH_EASE_OUT },
};
const AUTH_CHECK_MOTION = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { duration: 0.4, ease: AUTH_EASE_OUT },
};
const AUTH_CARDS_ENTRANCE = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.72, ease: AUTH_EASE_OUT },
  },
};
const AUTH_BUTTON_HOVER = {
  y: -2,
  boxShadow: "0 14px 30px rgba(23, 25, 34, 0.26)",
  transition: { duration: 0.2, ease: AUTH_EASE_OUT },
};
const AUTH_BUTTON_TAP = {
  y: 0,
  boxShadow: "0 5px 14px rgba(23, 25, 34, 0.14)",
  transition: { duration: 0.16, ease: AUTH_EASE_OUT },
};
const AUTH_DETAILS_SEQUENCE = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const AUTH_DETAILS_ITEM = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.58, ease: AUTH_EASE_OUT } },
};
const APP_SIDEBAR_MOTION = {
  initial: { opacity: 0, x: -18 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.42, ease: AUTH_EASE_OUT },
};
const APP_HEADER_MOTION = {
  initial: { opacity: 0, y: -14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay: 0.08, ease: AUTH_EASE_OUT },
};
const APP_SECTION_MOTION = {
  initial: { opacity: 0, y: 18, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.996 },
  transition: { duration: 0.34, ease: AUTH_EASE_OUT },
};
const APP_PANEL_HOVER = {
  y: -2,
  transition: { duration: 0.22, ease: AUTH_EASE_OUT },
};
const APP_BUTTON_TAP = {
  scale: 0.985,
  transition: { duration: 0.16, ease: AUTH_EASE_OUT },
};
// FRONTEND ENGINEER: Shared Style Profile motion keeps every section scroll-triggered and staggered.
const STYLE_SECTION_VIEWPORT = { once: true, margin: "-80px" };
const STYLE_SECTION_MOTION = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: AUTH_EASE_OUT, staggerChildren: 0.08 } },
};
const STYLE_ITEM_MOTION = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: AUTH_EASE_OUT } },
};
const STYLE_CARD_HOVER = { y: -3, transition: { duration: 0.2, ease: AUTH_EASE_OUT } };

function SplitLandingHeading({ children, id, className = "" }) {
  return (
    <h2 id={id} className={`landing-split-heading ${className}`}>
      {String(children || "").split(/\s+/).filter(Boolean).map((word, index) => (
        <span className="landing-word-mask" key={`${word}-${index}`}><span>{word}</span></span>
      ))}
    </h2>
  );
}

function useLandingScrollAnimations(enabled) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    if (!enabled || !rootRef.current) return undefined;

    const root = rootRef.current;
    let disposed = false;
    let teardown = () => {};

    Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([lenisModule, gsapModule, scrollTriggerModule]) => {
        if (disposed) return;
        const Lenis = lenisModule.default;
        const { gsap } = gsapModule;
        const { ScrollTrigger } = scrollTriggerModule;
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();

        media.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({
        autoRaf: false,
        duration: 1.08,
        easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value)),
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.92,
      });
      const updateScrollTrigger = () => ScrollTrigger.update();
      const updateLenis = (time) => lenis.raf(time * 1000);
      lenis.on("scroll", updateScrollTrigger);
      gsap.ticker.add(updateLenis);
      gsap.ticker.lagSmoothing(0);

      const anchorLinks = Array.from(root.querySelectorAll('.landing-nav a[href^="#"]'));
      const handleAnchorClick = (event) => {
        const href = event.currentTarget.getAttribute("href");
        const target = root.querySelector(href);
        if (!target) return;
        event.preventDefault();
        const pinnedTrigger = href === "#how-it-works" ? ScrollTrigger.getById("landing-how") : null;
        const destination = pinnedTrigger ? pinnedTrigger.start + 1 : target;
        window.history.replaceState(null, "", href);
        lenis.scrollTo(destination, { offset: pinnedTrigger ? 0 : -72, duration: 1.25 });
      };
      anchorLinks.forEach((link) => link.addEventListener("click", handleAnchorClick));

      let refreshFrame = 0;
      const scheduleRefresh = () => {
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      };
      const resizeObserver = new ResizeObserver(scheduleRefresh);
      resizeObserver.observe(root);
      window.addEventListener("load", scheduleRefresh);

      const context = gsap.context(() => {
        const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        heroTimeline
          .fromTo(".auth-copy .eyebrow", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55 })
          .fromTo(".landing-hero-word > span", { yPercent: 112, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.82, stagger: 0.065 }, "-=0.25")
          .fromTo(".auth-copy > p", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.46")
          .fromTo(".auth-benefits > span", { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.48, stagger: 0.08 }, "-=0.42")
          .fromTo(".landing-scroll-cue", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.18");

        gsap.to(".landing-scroll-cue", {
          autoAlpha: 0,
          y: 22,
          scrollTrigger: { trigger: ".auth-hero-stage", start: "top top", end: "+=220", scrub: 0.6 },
        });
        gsap.to(".auth-floating-cards-entrance", {
          yPercent: -17,
          scale: 1.045,
          scrollTrigger: { trigger: ".auth-hero-stage", start: "top top", end: "bottom top", scrub: 1.1 },
        });
        gsap.to(".auth-preview", {
          yPercent: -10,
          scale: 1.035,
          scrollTrigger: { trigger: ".auth-hero-stage", start: "top top", end: "bottom top", scrub: 1.3 },
        });

        gsap.utils.toArray(".landing-split-heading").forEach((heading) => {
          gsap.fromTo(
            heading.querySelectorAll(".landing-word-mask > span"),
            { yPercent: 110, rotate: 2 },
            {
              yPercent: 0,
              rotate: 0,
              stagger: 0.035,
              ease: "power3.out",
              scrollTrigger: { trigger: heading, start: "top 86%", end: "top 42%", scrub: 0.7 },
            },
          );
        });

        gsap.fromTo(
          ".auth-purpose-card",
          { autoAlpha: 0, y: 90, scale: 0.91, rotateX: 7 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: ".auth-purpose-grid", start: "top 82%", end: "center 55%", scrub: 0.75 },
          },
        );

        ScrollTrigger.matchMedia({
          "(min-width: 761px)": () => {
            const howSteps = gsap.utils.toArray(".auth-how-steps li");
            const howTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: ".auth-how",
                start: "top 12%",
                end: () => `+=${Math.min(window.innerHeight * 1.05, 900)}`,
                pin: true,
                scrub: 0.7,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                id: "landing-how",
              },
            });
            howTimeline.fromTo(".auth-how-copy", { y: 54, autoAlpha: 0.35 }, { y: 0, autoAlpha: 1, duration: 0.35 });
            howSteps.forEach((step, index) => {
              howTimeline
                .to(howSteps, { autoAlpha: 0.24, scale: 0.97, duration: 0.16 }, index ? "<" : undefined)
                .to(step, { autoAlpha: 1, scale: 1.035, x: 14, duration: 0.38, ease: "power2.out" })
                .to(step, { x: 0, duration: 0.2 });
            });

            const differencePoints = gsap.utils.toArray(".auth-difference-points p");
            const differenceTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: ".auth-difference",
                start: "top 82%",
                end: "center 46%",
                scrub: 0.75,
                invalidateOnRefresh: true,
              },
            });
            differenceTimeline
              .fromTo(".auth-difference", { y: 88, scale: 0.955 }, { y: 0, scale: 1, duration: 0.48, ease: "power2.out" })
              .fromTo(".auth-difference h2", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5 }, "<0.08");
            differencePoints.forEach((point) => {
              differenceTimeline.fromTo(point, { autoAlpha: 0.18, x: 42 }, { autoAlpha: 1, x: 0, duration: 0.32, ease: "power2.out" });
            });
          },
          "(max-width: 760px)": () => {
            gsap.utils.toArray(".auth-how-steps li, .auth-difference-points p").forEach((item) => {
              gsap.fromTo(item, { autoAlpha: 0, y: 28 }, {
                autoAlpha: 1,
                y: 0,
                duration: 0.65,
                ease: "power3.out",
                scrollTrigger: { trigger: item, start: "top 88%", toggleActions: "play none none reverse" },
              });
            });
          },
        });

        gsap.fromTo(".auth-details-cta", { autoAlpha: 0.3, y: 80, scale: 0.95 }, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".auth-details-cta", start: "top 92%", end: "top 55%", scrub: 0.8 },
        });

      }, root);

      return () => {
        context.revert();
        cancelAnimationFrame(refreshFrame);
        resizeObserver.disconnect();
        window.removeEventListener("load", scheduleRefresh);
        anchorLinks.forEach((link) => link.removeEventListener("click", handleAnchorClick));
        lenis.off("scroll", updateScrollTrigger);
        gsap.ticker.remove(updateLenis);
        lenis.destroy();
      };
        });

        media.add("(prefers-reduced-motion: reduce)", () => {
          gsap.set(root.querySelectorAll(".landing-hero-word > span, .landing-word-mask > span, .auth-purpose-card"), { clearProps: "all" });
        });

        teardown = () => media.revert();
      },
    );

    return () => {
      disposed = true;
      teardown();
    };
  }, [enabled]);

  return rootRef;
}
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  // FIXED: session persistence
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

class ApiRequestError extends Error {
  constructor(message, { status = 0, stage = "unknown", requestId = "" } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.stage = stage;
    this.requestId = requestId;
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeOrigin(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return "";
  }
}

function isLocalOrigin(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function getAuthRedirectOrigin() {
  const configuredOrigin = normalizeOrigin(AUTH_REDIRECT_ORIGIN);
  if (configuredOrigin) return configuredOrigin;

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  if (IS_DEV || (currentOrigin && !isLocalOrigin(currentOrigin))) return currentOrigin;
  return PRODUCTION_AUTH_ORIGIN;
}

function buildAuthRedirectUrl(flow) {
  const redirectUrl = new URL(getAuthRedirectOrigin());
  redirectUrl.searchParams.set("auth_flow", flow);
  return redirectUrl.toString();
}

function getAuthFlowFromLocation() {
  if (typeof window === "undefined") return "";
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return searchParams.get("auth_flow") || hashParams.get("type") || "";
}

function clearAuthFlowFromUrl() {
  if (typeof window === "undefined") return;
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

const MODES = [
  { key: "more_professional", label: "Professional", description: "Polished and confident" },
  { key: "sound_smarter", label: "Sharper", description: "Clearer and more precise" },
  { key: "fix_grammar", label: "Grammar", description: "Correct, same voice" },
];

const THEMES = {
  dark: {
    pageBackground: "#080808",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.4)",
    soft: "rgba(255,255,255,0.3)",
    border: "rgba(255,255,255,0.08)",
    surface: "rgba(255,255,255,0.05)",
    surfaceStrong: "rgba(0,0,0,0.72)",
    fieldBg: "rgba(255,255,255,0.05)",
    fieldText: "#ffffff",
    fieldPlaceholder: "#52525b",
    primaryBg: "#ffffff",
    primaryText: "#050505",
    secondaryBg: "rgba(0,0,0,0.35)",
    secondaryText: "#d4d4d8",
    activeNavBg: "#ffffff",
    activeNavText: "#050505",
    activeNavMeta: "rgba(0,0,0,0.72)",
    inactiveNavBg: "rgba(0,0,0,0.2)",
    inactiveNavText: "#d4d4d8",
    inactiveNavMeta: "#71717a",
    dashedBg: "rgba(0,0,0,0.7)",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "#d4d4d8",
    badgeBorder: "rgba(255,255,255,0.1)",
  },
  light: {
    pageBackground: "#f3f2ee",
    text: "#161616",
    muted: "#52525b",
    soft: "#6b7280",
    border: "rgba(17,24,39,0.08)",
    surface: "rgba(255,255,255,0.72)",
    surfaceStrong: "rgba(255,255,255,0.9)",
    fieldBg: "rgba(255,255,255,0.9)",
    fieldText: "#161616",
    fieldPlaceholder: "#9ca3af",
    primaryBg: "#161616",
    primaryText: "#ffffff",
    secondaryBg: "rgba(255,255,255,0.62)",
    secondaryText: "#161616",
    activeNavBg: "#161616",
    activeNavText: "#ffffff",
    activeNavMeta: "rgba(255,255,255,0.78)",
    inactiveNavBg: "rgba(255,255,255,0.45)",
    inactiveNavText: "#374151",
    inactiveNavMeta: "#6b7280",
    dashedBg: "rgba(255,255,255,0.65)",
    badgeBg: "rgba(17,24,39,0.05)",
    badgeText: "#374151",
    badgeBorder: "rgba(17,24,39,0.08)",
  },
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" style={{ vectorEffect: "non-scaling-stroke" }} aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M6.5 10.5V20h11V10.5" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" style={{ vectorEffect: "non-scaling-stroke" }} aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" style={{ vectorEffect: "non-scaling-stroke" }} aria-hidden="true">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.5 19c1.6-2.7 4-4 6.5-4s4.9 1.3 6.5 4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" style={{ vectorEffect: "non-scaling-stroke" }} aria-hidden="true">
      <path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z" />
      <path d="m19 12 .9 1.6-1.8 3.1-1.8-.2a7.8 7.8 0 0 1-1.4.8l-.7 1.7h-3.6l-.7-1.7a7.8 7.8 0 0 1-1.4-.8l-1.8.2L4.1 13.6 5 12l-.9-1.6 1.8-3.1 1.8.2c.4-.3.9-.5 1.4-.8l.7-1.7h3.6l.7 1.7c.5.2 1 .5 1.4.8l1.8-.2 1.8 3.1L19 12Z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3Z" />
      <path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function AnimatedCheckIcon() {
  return (
    <svg className="auth-success-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...AUTH_CHECK_MOTION}
      />
    </svg>
  );
}

function ThemeIcon({ theme }) {
  return theme === "dark" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
    </svg>
  );
}

function BrandLogoIcon({ light = false }) {
  const frameBackground = light ? "rgba(255,255,255,0.78)" : "#1a1a1a";
  const frameBorder = light ? "rgba(17,24,39,0.08)" : "rgba(255,255,255,0.08)";
  const markColor = light ? "#161616" : "#ffffff";
  const accentColor = light ? "rgba(22,22,22,0.42)" : "rgba(255,255,255,0.42)";

  return (
    <div style={{ width: 40, height: 40, borderRadius: 14, background: frameBackground, border: `1px solid ${frameBorder}`, boxShadow: light ? "inset 0 1px 0 rgba(255,255,255,0.8)" : "inset 0 1px 0 rgba(255,255,255,0.03)", position: "relative", overflow: "hidden", flexShrink: 0 }}>
      <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <rect x="8" y="10" width="20" height="16" rx="5" ry="5" fill="none" stroke={markColor} strokeWidth="2.4" />
        <path d="M13 26 12 32 18 27" fill={markColor} />
        <circle cx="14.5" cy="18" r="1.3" fill={markColor} />
        <circle cx="19" cy="18" r="1.3" fill={markColor} />
        <circle cx="23.5" cy="18" r="1.3" fill={markColor} />
        <path d="M24 10c4 0 6 2 6 6 0 2-1 4-3 6" fill="none" stroke={accentColor} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function getInitials(value) {
  const parts = value.split(/[^A-Za-z0-9]+/).map((part) => part.trim()).filter(Boolean);

  if (!parts.length) {
    return "C";
  }

  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

// FRONTEND: Normalize the authenticated aggregate while allowing additive backend contract evolution.
function normalizeStyleData(payload = {}) {
  const currentStyle = payload.current_style || payload.profile || payload.style_profile || {};
  const personaSnapshots = payload.persona_snapshots || payload.snapshots || [];
  const sortedSnapshots = Array.isArray(personaSnapshots)
    ? [...personaSnapshots].sort((left, right) => {
        const leftTime = new Date(left.captured_at || left.created_at || 0).getTime();
        const rightTime = new Date(right.captured_at || right.created_at || 0).getTime();
        return leftTime - rightTime;
      })
    : [];
  const emailHistory = payload.email_history || payload.history || [];
  const styleTags = payload.style_tags || payload.tags || [];
  const feedbackEvents = payload.feedback_events || payload.style_feedback || [];
  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1] || {};
  const learnedExamples = Number(currentStyle?.stats?.learned_examples || emailHistory.length || 0);
  const rawStrength =
    payload.style_strength ??
    payload.completeness ??
    latestSnapshot.completeness ??
    Math.min(1, learnedExamples / 10);
  const normalizedStrength = Number(rawStrength);

  return {
    currentStyle,
    personaSnapshots: sortedSnapshots,
    emailHistory: Array.isArray(emailHistory) ? emailHistory : [],
    feedbackEvents: Array.isArray(feedbackEvents) ? feedbackEvents : [],
    styleTags: Array.isArray(styleTags) ? styleTags : [],
    styleStrength: Number.isFinite(normalizedStrength)
      ? Math.max(0, Math.min(1, normalizedStrength > 1 ? normalizedStrength / 100 : normalizedStrength))
      : 0,
    lastUpdated: payload.last_updated || payload.updated_at || currentStyle?.stats?.last_learned_at || "",
    personaLabel: payload.persona_label || currentStyle.persona_label || "",
    personaSummary: payload.persona_summary || currentStyle.persona_summary || payload.summary || "",
    emailsAnalyzed: Number(payload.emails_analyzed || currentStyle.emails_analyzed || currentStyle?.stats?.learned_examples || emailHistory.length || 0),
  };
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0%";
  return `${Math.round(Math.max(0, Math.min(1, number > 1 ? number / 100 : number)) * 100)}%`;
}

function formatDate(value, options = {}) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: options.short ? undefined : "numeric",
  });
}

// FRONTEND: Convert backend persona fields into confidence-bearing nodes for the custom map.
function getPersonaTraits(style = {}, tags = []) {
  const persona = style.persona || {};
  const confidences = persona.confidence || persona.confidences || style.confidence || {};
  const rawTraits = Array.isArray(persona.traits) ? persona.traits : [];
  const labelMap = {
    tone_formal_casual: "tone",
    average_sentence_length: "sentence rhythm",
    vocabulary_richness: "vocabulary",
    punctuation_patterns: "punctuation",
    preferred_openers: "openings",
    preferred_closers: "sign-offs",
    top_recurring_phrases: "signature phrases",
    active_voice_ratio: "active voice",
    humor_presence: "humor",
    contraction_usage: "contractions",
    deference_markers: "deference",
    ask_placement: "ask placement",
  };
  const learnedTraits = Object.entries(style.traits || {}).map(([key, trait]) => ({
    label: labelMap[key] || key,
    category: key,
    confidence: trait?.confidence,
    score: trait?.score ?? trait?.value,
    trend: trait?.trend || "stable",
    raw: trait,
  }));
  const labeledTraits = ["formality", "directness", "energy"]
    .filter((key) => persona[key])
    .map((key) => ({ label: persona[key], category: key }));
  const tagTraits = tags.map((tag) => ({ label: tag, category: "trait" }));
  const candidates = [...learnedTraits, ...labeledTraits, ...rawTraits, ...tagTraits];
  const seen = new Set();

  return candidates
    .map((trait, index) => {
      const value = typeof trait === "object" ? trait : { label: trait };
      const label = String(value.label || value.name || value.trait || "").trim();
      const confidenceValue =
        value.confidence ??
        confidences[value.category] ??
        confidences[label] ??
        Math.max(0.44, 0.88 - index * 0.07);
      const confidence = Number(confidenceValue);
      const scoreValue = value.score ?? value.raw?.score ?? value.raw?.confidence ?? confidenceValue;
      const score = Number(scoreValue);
      return {
        label,
        category: value.category || "trait",
        confidence: Number.isFinite(confidence)
          ? Math.max(0.2, Math.min(1, confidence > 1 ? confidence / 100 : confidence))
          : 0.6,
        score: Number.isFinite(score) ? Math.max(0, Math.min(1, score > 1 ? score / 100 : score)) : 0.5,
        trend: value.trend || value.raw?.trend || "stable",
        raw: value.raw || {},
      };
    })
    .filter((trait) => {
      const key = trait.label.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);
}

function getTraitCards(style = {}) {
  const traits = style.traits || {};
  const descriptions = {
    formality: "How polished and professional your emails feel.",
    warmth: "How much relational softness and friendliness shows through.",
    confidence: "How assertively you make recommendations and asks.",
    directness: "How quickly and clearly you get to the point.",
    vocabulary_richness: "How varied and precise your word choice is.",
    active_voice_ratio: "How often your sentences feel active and agent-driven.",
    empathy: "How often you acknowledge the reader's situation.",
    urgency: "How strongly you signal deadlines or action pressure.",
    humor_presence: "How often personality or levity enters your emails.",
    deference_markers: "How often you soften requests with deference.",
    contraction_usage: "How conversational your phrasing feels.",
    reciprocity: "How often you offer help before or alongside asks.",
  };
  return Object.entries(descriptions).map(([key, description]) => {
    const trait = traits[key] || {};
    const score = Number(trait.score ?? trait.confidence ?? 0);
    const confidence = Number(trait.confidence ?? 0);
    return {
      key,
      name: titleCase(key),
      description,
      score: Number.isFinite(score) ? Math.max(0, Math.min(1, score > 1 ? score / 100 : score)) : 0,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)) : 0,
      trend: trait.trend || "stable",
    };
  });
}

function buildPersonaSummary(style = {}, suppliedSummary = "") {
  if (suppliedSummary) return suppliedSummary;
  const persona = style.persona || {};
  const preferences = style.preferences || {};
  const descriptors = [persona.formality, persona.directness, persona.energy]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (!descriptors.length && !style?.stats?.learned_examples) {
    return "Finalize a few rewrites and PhraseAI will turn your choices into a clear, useful writing persona.";
  }

  const opening = descriptors.length
    ? `Your voice is ${descriptors.join(", ")}.`
    : "Your writing voice is taking shape.";
  const sentenceLength = Number(preferences.avg_sentence_length);
  const rhythm = Number.isFinite(sentenceLength) && sentenceLength > 0
    ? ` You tend to write ${sentenceLength < 14 ? "concise" : sentenceLength > 22 ? "more detailed" : "balanced"} sentences.`
    : "";
  const warmth = preferences.prefers_greeting === "used"
    ? " You usually open with a greeting"
    : " You favor efficient openings";
  const signoff = preferences.prefers_signoff === "used"
    ? " and close with a friendly sign-off."
    : ".";
  return `${opening}${rhythm}${warmth}${signoff}`;
}

function PersonaMap({ initials, traits, personaLabel, onSelectTrait }) {
  const nodes = traits.map((trait, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(traits.length, 1);
    return {
      ...trait,
      x: 210 + Math.cos(angle) * (index % 2 ? 128 : 112),
      y: 155 + Math.sin(angle) * (index % 2 ? 104 : 92),
    };
  });

  return (
    <svg className="persona-map-svg" viewBox="0 0 420 310" role="img" aria-label="A map of your strongest writing traits">
      <defs>
        <radialGradient id="personaCore" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#a3f4cd" />
          <stop offset="100%" stopColor="#55ca91" />
        </radialGradient>
        <filter id="personaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle className="persona-orbit persona-orbit-one" cx="210" cy="155" r="92" />
      <circle className="persona-orbit persona-orbit-two" cx="210" cy="155" r="130" />
      {nodes.map((node, index) => (
        <motion.g
          key={`${node.label}-${index}`}
          className="persona-node-group"
          initial={{ opacity: 0, scale: 0.82 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={STYLE_SECTION_VIEWPORT}
          transition={{ duration: 0.35, delay: index * 0.08, ease: AUTH_EASE_OUT }}
          whileHover={{ scale: 1.04 }}
          onClick={() => onSelectTrait?.(node)}
          tabIndex="0"
          role="button"
          aria-label={`${titleCase(node.label)} score ${formatPercent(node.score)} confidence ${formatPercent(node.confidence)}`}
        >
          <motion.line
            className="persona-edge"
            x1="210"
            y1="155"
            x2={node.x}
            y2={node.y}
            style={{ opacity: 0.18 + node.confidence * 0.68, strokeWidth: 0.8 + node.confidence * 2.2 }}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={STYLE_SECTION_VIEWPORT}
            transition={{ duration: 0.55, delay: 0.35 + index * 0.05, ease: AUTH_EASE_OUT }}
          />
          <circle
            className="persona-node-halo"
            cx={node.x}
            cy={node.y}
            r={18 + node.confidence * 12}
            style={{ opacity: 0.06 + node.confidence * 0.08 }}
          />
          <circle className="persona-node" cx={node.x} cy={node.y} r={5 + node.confidence * 7} />
          <text
            className="persona-node-label"
            x={node.x}
            y={node.y + (node.y < 155 ? -17 : 23)}
            textAnchor="middle"
          >
            {titleCase(node.label)}
          </text>
          <text
            className="persona-node-confidence"
            x={node.x}
            y={node.y + (node.y < 155 ? -5 : 35)}
            textAnchor="middle"
          >
            {Math.round(node.confidence * 100)}%
          </text>
          <title>{`${titleCase(node.label)}: score ${formatPercent(node.score)}, confidence ${formatPercent(node.confidence)}, trend ${node.trend}`}</title>
        </motion.g>
      ))}
      <circle className="persona-core-glow" cx="210" cy="155" r="42" filter="url(#personaGlow)" />
      <circle className="persona-core" cx="210" cy="155" r="34" fill="url(#personaCore)" />
      <text className="persona-initials" x="210" y="161" textAnchor="middle">{initials}</text>
      <text className="persona-core-label" x="210" y="208" textAnchor="middle">{personaLabel}</text>
    </svg>
  );
}

function StyleSection({ className = "", children, style }) {
  return (
    <motion.section
      className={className}
      style={style}
      variants={STYLE_SECTION_MOTION}
      initial="hidden"
      whileInView="visible"
      viewport={STYLE_SECTION_VIEWPORT}
    >
      {children}
    </motion.section>
  );
}

function KineticHeading({ children, className = "" }) {
  const words = String(children || "").split(/\s+/).filter(Boolean);
  return (
    <motion.h2
      className={`kinetic-heading ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12%" }}
      variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
    >
      {words.map((word, index) => (
        <span className="kinetic-word-mask" key={`${word}-${index}`}>
          <motion.span
            variants={{
              hidden: { y: "112%", rotate: 2.5, opacity: 0 },
              visible: { y: "0%", rotate: 0, opacity: 1, transition: { duration: 0.7, ease: AUTH_EASE_OUT } },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}

function ScrollMarquee({ containerRef, items }) {
  const marqueeRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: containerRef, target: marqueeRef, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 88, damping: 27, mass: 0.8 });
  const x = useTransform(progress, [0, 1], ["2%", "-34%"]);
  const source = items.length ? items : ["Tone", "Rhythm", "Clarity", "Intent"];
  const content = [...source, ...source, ...source];
  return (
    <div className="scroll-marquee" ref={marqueeRef} aria-hidden="true">
      <motion.div style={{ x }}>
        {content.map((item, index) => <span key={`${item}-${index}`}>{item}<i /></span>)}
      </motion.div>
    </div>
  );
}

function ScrollScene({ containerRef, className = "", label = "", chapter = "", children }) {
  const sceneRef = useRef(null);
  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: sceneRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 76, damping: 22, mass: 0.96, restDelta: 0.001 });
  const y = useTransform(progress, [0, 0.13, 0.28, 0.76, 1], [148, 74, 0, 0, -108]);
  const scale = useTransform(progress, [0, 0.18, 0.3, 0.76, 1], [0.86, 0.96, 1, 1, 0.945]);
  const scaleY = useTransform(progress, [0, 0.18, 0.3, 0.78, 0.92, 1], [0.9, 1.025, 1, 1, 1.045, 0.98]);
  const opacity = useTransform(progress, [0, 0.12, 0.25, 0.84, 1], [0.08, 0.55, 1, 1, 0.25]);
  const rotateX = useTransform(progress, [0, 0.2, 0.32, 0.78, 1], [8, 2.5, 0, 0, -4]);
  const accentX = useTransform(progress, [0, 1], ["-35%", "135%"]);
  const clipPath = useTransform(
    progress,
    [0, 0.18, 0.82, 1],
    ["inset(9% 5% 9% 5% round 24px)", "inset(0% 0% 0% 0% round 0px)", "inset(0% 0% 0% 0% round 0px)", "inset(4% 2% 4% 2% round 18px)"],
  );
  const tetherScale = useTransform(progress, [0, 0.36, 0.7, 0.92, 1], [0, 0, 0.35, 1, 0.18]);
  const tetherOpacity = useTransform(progress, [0, 0.48, 0.7, 0.92, 1], [0, 0, 0.8, 1, 0]);
  const tetherNodeY = useTransform(progress, [0.48, 0.92], [0, 210]);
  const pullCopyY = useTransform(progress, [0.5, 0.88], [18, 0]);

  return (
    <section ref={sceneRef} className={`app-cinematic-scene ${className}`} aria-label={label || undefined}>
      <motion.div className="app-cinematic-frame" style={{ y, scale, scaleY, opacity, rotateX, clipPath }}>
        <motion.span className="app-cinematic-scan" style={{ x: accentX }} aria-hidden="true" />
        {chapter ? <span className="app-cinematic-chapter" aria-hidden="true">{chapter}</span> : null}
        {children}
      </motion.div>
      <motion.div className="app-cinematic-tether" style={{ scaleY: tetherScale, opacity: tetherOpacity }} aria-hidden="true">
        <motion.span style={{ y: tetherNodeY }} />
      </motion.div>
      <motion.span className="app-cinematic-pull-copy" style={{ y: pullCopyY, opacity: tetherOpacity }} aria-hidden="true">
        Pull next chapter
      </motion.span>
    </section>
  );
}

function CompletenessRing({ value, label = "complete" }) {
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));
  const circumference = 2 * Math.PI * 44;
  const offset = circumference * (1 - normalized);
  return (
    <div className="profile-ring" aria-label={`Style profile ${formatPercent(normalized)} ${label}`}>
      <svg viewBox="0 0 104 104">
        <circle className="profile-ring-track" cx="52" cy="52" r="44" />
        <motion.circle
          className="profile-ring-progress"
          cx="52"
          cy="52"
          r="44"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={STYLE_SECTION_VIEWPORT}
          transition={{ duration: 0.8, delay: 0.3, ease: AUTH_EASE_OUT }}
        />
      </svg>
      <strong>{formatPercent(normalized)}</strong>
      <span>{label}</span>
    </div>
  );
}

function TraitBreakdownCard({ trait }) {
  const trendLabel = trait.trend === "increasing" ? "↑ Growing" : trait.trend === "shifting" ? "↓ Shifting" : "→ Stable";
  const confidenceClass = trait.confidence > 0.7 ? "high" : trait.confidence > 0.4 ? "medium" : "low";
  return (
    <motion.article className="trait-breakdown-card" variants={STYLE_ITEM_MOTION} whileHover={STYLE_CARD_HOVER}>
      <div className="trait-card-topline">
        <span>{trait.name}</span>
        <em className={`confidence-dot ${confidenceClass}`} />
      </div>
      <strong>{formatPercent(trait.score)}</strong>
      <div className="trait-score-bar">
        <motion.span
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.round(trait.score * 100)}%` }}
          viewport={STYLE_SECTION_VIEWPORT}
          transition={{ duration: 0.6, ease: AUTH_EASE_OUT }}
        />
      </div>
      <p>{trait.description}</p>
      <small>{trendLabel} · confidence {formatPercent(trait.confidence)}</small>
    </motion.article>
  );
}

function TraitDrawer({ trait, onClose }) {
  if (!trait) return null;
  return (
    <motion.aside
      className="trait-drawer"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: AUTH_EASE_OUT }}
    >
      <button type="button" onClick={onClose} aria-label="Close trait details">×</button>
      <span className="eyebrow">TRAIT DETAIL</span>
      <h3>{titleCase(trait.label)}</h3>
      <p>Score {formatPercent(trait.score)} with {formatPercent(trait.confidence)} confidence. Trend: {trait.trend || "stable"}.</p>
      <div className="trait-sparkline" aria-hidden="true">
        {[0.3, 0.42, 0.38, trait.confidence || 0.5, trait.score || 0.5].map((point, index) => (
          <span key={index} style={{ height: `${Math.max(16, point * 54)}px` }} />
        ))}
      </div>
      <p className="drawer-note">Recent rewrites use this trait as a weighted suggestion. Higher confidence means PhraseAI follows it more strongly.</p>
    </motion.aside>
  );
}

function App() {
  const authErrorTimerRef = useRef(null);
  const appContentRef = useRef(null);
  // SCROLL-ANIM: A damped scroll signal keeps trackpad and wheel movement fluid without delaying intent.
  const { scrollY: authScrollY } = useScroll();
  const smoothAuthScrollY = useSpring(authScrollY, AUTH_SCROLL_SPRING);
  const authBackgroundY = useTransform(smoothAuthScrollY, AUTH_SCROLL_INPUT, AUTH_BACKGROUND_SCROLL_OUTPUT);
  const authCardsY = useTransform(smoothAuthScrollY, AUTH_SCROLL_INPUT, AUTH_CARDS_SCROLL_OUTPUT);
  // SCROLL-ANIM: The full hero yields while the details surface rises, creating one continuous pulling gesture.
  const authHeroScale = useTransform(smoothAuthScrollY, AUTH_PULL_SCROLL_INPUT, AUTH_HERO_SCALE_OUTPUT);
  const authHeroOpacity = useTransform(smoothAuthScrollY, AUTH_PULL_SCROLL_INPUT, AUTH_HERO_OPACITY_OUTPUT);
  const authHeroY = useTransform(smoothAuthScrollY, AUTH_PULL_SCROLL_INPUT, AUTH_HERO_Y_OUTPUT);
  const authDetailsY = useTransform(smoothAuthScrollY, AUTH_PULL_SCROLL_INPUT, AUTH_DETAILS_PULL_OUTPUT);
  const authDetailsScale = useTransform(smoothAuthScrollY, AUTH_PULL_SCROLL_INPUT, AUTH_DETAILS_SCALE_OUTPUT);
  const authDetailsRotate = useTransform(smoothAuthScrollY, AUTH_PULL_SCROLL_INPUT, AUTH_DETAILS_ROTATE_OUTPUT);
  // SCROLL-ANIM: Track the app scroll container directly so protected pages get the same layered pull as login.
  const { scrollY: appScrollY, scrollYProgress: appScrollProgress } = useScroll({ container: appContentRef });
  const smoothAppScrollY = useSpring(appScrollY, APP_SCROLL_SPRING);
  const smoothAppScrollProgress = useSpring(appScrollProgress, APP_SCROLL_SPRING);
  const styleHeroY = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_HERO_Y_OUTPUT);
  const styleHeroScale = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_HERO_SCALE_OUTPUT);
  const styleHeroOpacity = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_HERO_OPACITY_OUTPUT);
  const styleMapY = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_MAP_Y_OUTPUT);
  const styleSideY = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_SIDE_Y_OUTPUT);
  const styleTimelineY = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_TIMELINE_Y_OUTPUT);
  const styleTraitsY = useTransform(smoothAppScrollY, STYLE_SCROLL_INPUT, STYLE_TRAITS_Y_OUTPUT);
  const historyHeroY = useTransform(smoothAppScrollY, HISTORY_SCROLL_INPUT, HISTORY_HERO_Y_OUTPUT);
  const historyHeroScale = useTransform(smoothAppScrollY, HISTORY_SCROLL_INPUT, HISTORY_HERO_SCALE_OUTPUT);
  const historyToolbarY = useTransform(smoothAppScrollY, HISTORY_SCROLL_INPUT, HISTORY_TOOLBAR_Y_OUTPUT);
  const historyFeedY = useTransform(smoothAppScrollY, HISTORY_SCROLL_INPUT, HISTORY_FEED_Y_OUTPUT);
  const appPlaneY = useTransform(smoothAppScrollY, APP_GLOBAL_SCROLL_INPUT, APP_PLANE_Y_OUTPUT);
  const appPlaneScale = useTransform(smoothAppScrollY, APP_GLOBAL_SCROLL_INPUT, APP_PLANE_SCALE_OUTPUT);
  const appAmbientY = useTransform(smoothAppScrollY, APP_GLOBAL_SCROLL_INPUT, APP_AMBIENT_Y_OUTPUT);
  const appAmbientRotate = useTransform(smoothAppScrollY, APP_GLOBAL_SCROLL_INPUT, APP_AMBIENT_ROTATE_OUTPUT);
  const appHeaderY = useTransform(smoothAppScrollY, [0, 240], APP_HEADER_Y_OUTPUT);
  const appHeaderOpacity = useTransform(smoothAppScrollY, [0, 240], APP_HEADER_OPACITY_OUTPUT);
  const [draft, setDraft] = useState("");
  const [contextText, setContextText] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [mode, setMode] = useState("more_professional");
  const [rewritten, setRewritten] = useState("");
  const [lastAiOutput, setLastAiOutput] = useState("");
  const [lastRewriteSource, setLastRewriteSource] = useState("provider");
  const [activeSection, setActiveSection] = useState("home");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState("");
  const [learnMessage, setLearnMessage] = useState("");
  const [stressMessage, setStressMessage] = useState("");
  const [stressLoading, setStressLoading] = useState(false);
  const [styleData, setStyleData] = useState(() => normalizeStyleData());
  const [styleDataLoading, setStyleDataLoading] = useState(false);
  const [styleDataError, setStyleDataError] = useState("");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [selectedTrait, setSelectedTrait] = useState(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState({});
  const [manualEditIds, setManualEditIds] = useState({});
  const [manualEditDrafts, setManualEditDrafts] = useState({});
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  // FIXER: [CHANGED] Feedback state is row-specific so independent history entries can update concurrently.
  const [feedbackBusyIds, setFeedbackBusyIds] = useState({});
  const [feedbackMessages, setFeedbackMessages] = useState({});
  const feedbackPendingRef = useRef(new Map());
  // FIXER: [CHANGED] Session generations prevent stale feedback responses from crossing logout/login boundaries.
  const authGenerationRef = useRef(0);
  const [copyStatus, setCopyStatus] = useState("Copy");
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // REDESIGN: [CHANGED] Keep password visibility and the successful-login transition local to the auth screen.
  const [showPassword, setShowPassword] = useState(false);
  const [authSucceeded, setAuthSucceeded] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [aiInfo, setAiInfo] = useState(null);
  const [lastDiagnostic, setLastDiagnostic] = useState(null);
  const loginAttemptsRef = useRef(new Map());
  const accountName = session?.user?.email || "Client";
  const accountInitials = getInitials(accountName);
  const landingRef = useLandingScrollAnimations(authReady && (!session?.access_token || isPasswordRecovery));

  useEffect(() => {
    let active = true;

    async function loadAiInfo() {
      try {
        const response = await fetch(`${API_URL}/ai/model`);
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setAiInfo(data);
        }
      } catch {
        // Ignore model info failures in UI; core app should stay usable.
      }
    }

    loadAiInfo();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const container = appContentRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSection]);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      const authFlow = getAuthFlowFromLocation();
      if (authFlow === "recovery") {
        setIsPasswordRecovery(true);
        setAuthMode("recovery");
      }

      if (!supabase) {
        setAuthError("Missing Supabase frontend configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setAuthReady(true);
        return;
      }

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sessionError) {
          setAuthError(sessionError.message || "Could not read current session.");
        }

        // FIXED: session persistence
        setSession(data.session || null);
      } catch {
        // INSPECTOR: [SILENT CATCH] Auth bootstrap failures now resolve to the login screen instead of hanging forever.
        if (mounted) {
          setSession(null);
          setAuthError("Could not connect to authentication. Please refresh and try again.");
        }
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    bootstrapAuth();

    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange((event, nextSession) => {
          // AGENT3: [CHANGE] Recovery links now enter a dedicated set-password state instead of a dead-end login screen.
          if (event === "PASSWORD_RECOVERY") {
            setIsPasswordRecovery(true);
            setAuthMode("recovery");
            clearAuthFlowFromUrl();
          }
          if (event === "SIGNED_IN" && nextSession) {
            // FIXED: session persistence
            // REDESIGN: [CHANGED] Show success feedback before revealing the protected application.
            setAuthSucceeded(true);
            // SCROLL-ANIM: Allow the checkmark and form exit to finish before revealing the app.
            window.setTimeout(() => setSession(nextSession), AUTH_SUCCESS_REDIRECT_MS);
            return;
          }
          // FIXED: session persistence
          setSession(nextSession || null);
        })
      : { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => () => window.clearTimeout(authErrorTimerRef.current), []);

  useEffect(() => {
    // FIXER: [CHANGED] Every auth transition invalidates pending feedback and clears row-local UI state.
    authGenerationRef.current += 1;
    feedbackPendingRef.current.clear();
    setFeedbackBusyIds({});
    setFeedbackMessages({});
    if (!session?.access_token) {
      setStyleData(normalizeStyleData());
      setStyleDataError("");
      return;
    }
    loadStyleData();
  }, [session?.access_token]);

  const tokens = THEMES[theme];

  const modeLabel = useMemo(() => {
    const found = MODES.find((m) => m.key === mode);
    return found ? found.label : mode;
  }, [mode]);

  const navItems = [
    { key: "home", label: "Home", description: "Rewrite and refine", icon: HomeIcon },
    { key: "history", label: "History", description: "Recent rewritten drafts", icon: HistoryIcon },
    { key: "style-profile", label: "Style Profile", description: "Learned writing persona", icon: ProfileIcon },
  ];

  const isHome = activeSection === "home";
  const isHistory = activeSection === "history";
  const isSettings = activeSection === "settings";
  const isStyleProfile = activeSection === "style-profile";
  const isAccount = activeSection === "account";
  const rewriteReady = draft.trim().length > 0;
  const outputReady = rewritten.trim().length > 0;
  const finalizeReady = outputReady && lastAiOutput.trim().length > 0;

  async function apiFetch(path, options = {}) {
    if (!supabase) {
      // DETECTIVE: [TRIGGER FOUND] This statusless auth setup error was previously misclassified as an AI outage.
      throw new ApiRequestError("Authentication is unavailable.", { stage: "auth_setup" });
    }

    let sessionResult;
    try {
      sessionResult = await supabase.auth.getSession();
    } catch {
      // INSPECTOR: [SILENT CATCH] Session transport failures are now typed separately from provider failures.
      throw new ApiRequestError("Could not verify your session. Please sign in again.", { stage: "session" });
    }
    const { data: sessionData, error: sessionError } = sessionResult;
    if (sessionError) {
      throw new ApiRequestError("Could not verify your session. Please sign in again.", { stage: "session" });
    }
    let activeSession = sessionData.session || session;
    if (!activeSession?.access_token) {
      throw new ApiRequestError("You must be logged in.", { status: 401, stage: "session" });
    }

    async function sendRequest(accessToken) {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      };
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        return await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
      } catch (requestError) {
        const timedOut = requestError?.name === "AbortError";
        throw new ApiRequestError(
          timedOut ? "PhraseAI took too long to respond. Please try again." : "Could not reach PhraseAI. Check your connection and try again.",
          { stage: timedOut ? "timeout" : "transport" },
        );
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    let response = await sendRequest(activeSession.access_token);
    if (response.status === 401) {
      // AGENT3: [CHANGE] Retry one authenticated request after token refresh before ending the session.
      let refreshResult;
      try {
        refreshResult = await supabase.auth.refreshSession();
      } catch {
        throw new ApiRequestError("Your session could not be refreshed. Please sign in again.", { status: 401, stage: "session" });
      }
      const { data: refreshedData, error: refreshError } = refreshResult;
      if (refreshError) {
        throw new ApiRequestError("Your session could not be refreshed. Please sign in again.", { status: 401, stage: "session" });
      }
      activeSession = refreshedData.session;
      if (activeSession?.access_token) {
        response = await sendRequest(activeSession.access_token);
      }
    }

    const responseText = await response.text();
    let data = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        if (response.ok) {
          throw new ApiRequestError("PhraseAI returned an invalid response. Please try again.", {
            status: response.status,
            stage: "response",
          });
        }
      }
    }

    if (!response.ok) {
      // AGENT4: [HARDENED] UI shows stable messages instead of raw backend/provider exception strings.
      const problem = typeof data.detail === "object" && data.detail ? data.detail : data;
      const safeMessage =
        response.status === 401
          ? "Your session expired. Please sign in again."
          : response.status === 422
            ? "This draft or context is too large or invalid."
            : typeof data.detail === "string"
              ? data.detail
              : typeof problem.message === "string"
                ? problem.message
              : "Request failed.";
      throw new ApiRequestError(safeMessage, {
        status: response.status,
        stage: problem.stage || "backend",
        requestId: problem.request_id || "",
      });
    }

    if (path === "/rewrite") {
      try {
        validateRewriteResponse(data);
      } catch {
        throw new ApiRequestError("PhraseAI returned an incomplete rewrite. Please try again.", {
          status: response.status,
          stage: "response",
        });
      }
    }

    return data;
  }

  // FRONTEND: Style profile and history share one authenticated aggregate and one refresh path.
  async function loadStyleData({ quiet = false } = {}) {
    if (!quiet) setStyleDataLoading(true);
    setStyleDataError("");
    try {
      const data = normalizeStyleData(await apiFetch("/style-data/me"));
      setStyleData(data);
      setSelectedSnapshotId((current) => {
        if (current && data.personaSnapshots.some((snapshot) => String(snapshot.id) === current)) {
          return current;
        }
        const latest = data.personaSnapshots[data.personaSnapshots.length - 1];
        return latest ? String(latest.id ?? data.personaSnapshots.length - 1) : "";
      });
    } catch (err) {
      setStyleDataError(err.message || "Could not load your style profile.");
    } finally {
      if (!quiet) setStyleDataLoading(false);
    }
  }

  async function handleRewrite() {
    setError("");
    if (!draft.trim()) {
      setError("Please enter an email draft first.");
      return;
    }

    setLoading(true);
    try {
      const requestPayload = {
        draft,
        mode,
        context: contextText.trim() || null,
      };

      const data = await apiFetch("/rewrite", {
        method: "POST",
        body: JSON.stringify(requestPayload),
      });

      setRewritten(data.rewritten || "");
      setLastAiOutput(data.rewritten || "");
      setLastRewriteSource(data.source || "provider");
      setLearnMessage("");
      setLastDiagnostic({
        stage: data.source === "fallback" ? "provider" : "complete",
        status: 200,
        source: data.source || "provider",
        reason: data.fallback_reason || "",
        requestId: data.request_id || "",
      });
      if (data.source === "fallback") {
        const fallbackMessages = {
          rate_limited: "The AI provider is rate-limited right now. A local rewrite is shown instead.",
          billing: "The AI provider needs billing credits. A local rewrite is shown until credits are restored.",
          authentication: "The AI provider credentials need attention. A local rewrite is shown instead.",
          model_unavailable: "The configured AI model is unavailable. A local rewrite is shown instead.",
          timeout: "The AI provider took too long to respond. A local rewrite is shown instead.",
          provider_unavailable: "The AI provider is temporarily unavailable. A local rewrite is shown instead.",
        };
        setError(fallbackMessages[data.fallback_reason] || fallbackMessages.provider_unavailable);
      }
    } catch (err) {
      // DETECTIVE: [REAL ERROR HIDDEN HERE] Statusless session/network failures enter the same user-facing fallback as provider outages.
      const message = err?.message || "Unexpected rewrite error.";
      // ARCHITECT: [STRUCTURAL FLAW] The browser no longer fabricates an AI fallback for session, transport, or backend failures.
      setLastDiagnostic({
        stage: err?.stage || "unknown",
        status: err?.status || 0,
        source: "error",
        reason: "",
        requestId: err?.requestId || "",
      });
      setLastRewriteSource("provider");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizeVersion() {
    setLearnMessage("");

    if (!rewritten.trim()) {
      setLearnMessage("Write or edit a final version first.");
      return;
    }

    if (!lastAiOutput.trim()) {
      setLearnMessage("Generate a rewrite first so learning has a baseline.");
      return;
    }

    setLearning(true);
    try {
      await apiFetch("/learn", {
        method: "POST",
        body: JSON.stringify({
          mode,
          draft,
          ai_output: lastAiOutput,
          final_version: rewritten,
        }),
      });

      await loadStyleData({ quiet: true });
      setLearnMessage("Saved. Future rewrites will adapt to your style.");
    } catch (err) {
      // TRACER: [REAL ERROR HIDDEN HERE]
      console.error("Learning update request failed", err);
      setLearnMessage(err.message || "Could not save learning signal.");
    } finally {
      setLearning(false);
    }
  }

  async function runStressTest() {
    setStressMessage("");
    setStressLoading(true);

    try {
      const data = await apiFetch("/dev/stress-test", {
        method: "POST",
        body: JSON.stringify({ samples_per_phase: 15 }),
      });

      setStressMessage(`Stress test completed with ${data.processed_samples || 0} samples.`);
      await loadStyleData({ quiet: true });
    } catch (err) {
      setStressMessage(err.message || "Could not run stress test.");
    } finally {
      setStressLoading(false);
    }
  }

  async function copyResult() {
    if (!rewritten) return;
    await navigator.clipboard.writeText(rewritten);
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus("Copy"), 1200);
  }

  // FIXER: [CHANGED] Optimistically rate one row, consume the returned aggregate, and roll back only that row on failure.
  async function handleHistoryFeedback(entryId, rating, extraPayload = {}) {
    if (!entryId) return;
    const rowId = String(entryId);
    if (feedbackPendingRef.current.has(rowId)) return;
    const requestGeneration = authGenerationRef.current;

    const previousEntry = styleData.emailHistory.find((entry, index) => String(entry.id ?? index) === rowId);
    const previousFeedback = previousEntry?.feedback;
    feedbackPendingRef.current.set(rowId, rating);
    setFeedbackBusyIds((current) => ({ ...current, [rowId]: true }));
    setFeedbackMessages((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
    setStyleData((current) => ({
      ...current,
      emailHistory: current.emailHistory.map((entry, index) =>
        String(entry.id ?? index) === rowId
          ? {
              ...entry,
              feedback: {
                ...(typeof entry.feedback === "object" && entry.feedback ? entry.feedback : {}),
                style_rating: rating,
                manual_edit: extraPayload.manual_edit,
              },
            }
          : entry),
    }));

    try {
      const response = await apiFetch(`/email-history/${encodeURIComponent(entryId)}/feedback`, {
        method: "POST",
        body: JSON.stringify({ rating, ...extraPayload }),
      });
      // FIXER: [CHANGED] Ignore responses belonging to a session that has since ended or changed.
      if (authGenerationRef.current !== requestGeneration) return;
      feedbackPendingRef.current.delete(rowId);
      const aggregate = normalizeStyleData(response);
      aggregate.emailHistory = aggregate.emailHistory.map((entry, index) => {
        const pendingRating = feedbackPendingRef.current.get(String(entry.id ?? index));
        return pendingRating
          ? {
              ...entry,
              feedback: {
                ...(typeof entry.feedback === "object" && entry.feedback ? entry.feedback : {}),
                style_rating: pendingRating,
              },
            }
          : entry;
      });
      setStyleData(aggregate);
      setFeedbackMessages((current) => ({
        ...current,
        [rowId]: {
          type: "success",
          text: rating === "good" ? "Saved as a good match." : rating === "edited" ? "Saved your edit. PhraseAI learned from the correction." : "Saved. PhraseAI will adjust.",
        },
      }));
      if (rating === "edited") {
        setManualEditIds((current) => ({ ...current, [rowId]: false }));
      }
    } catch (err) {
      if (authGenerationRef.current !== requestGeneration) return;
      feedbackPendingRef.current.delete(rowId);
      setStyleData((current) => ({
        ...current,
        emailHistory: current.emailHistory.map((entry, index) =>
          String(entry.id ?? index) === rowId
            ? { ...entry, feedback: previousFeedback }
            : entry),
      }));
      // TRACER: [REAL ERROR HIDDEN HERE]
      console.error("Style feedback request failed", err);
      setFeedbackMessages((current) => ({
        ...current,
        [rowId]: { type: "error", text: err.message || "Could not save feedback." },
      }));
    } finally {
      if (authGenerationRef.current !== requestGeneration) return;
      setFeedbackBusyIds((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthError("Supabase client is not configured.");
      return;
    }

    setAuthBusy(true);
    setAuthSucceeded(false);
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "forgot") {
        await sendPasswordReset();
        return;
      }

      if (isPasswordRecovery || authMode === "recovery") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setIsPasswordRecovery(false);
        setAuthMode("signin");
        setAuthMessage("Password updated. You can continue with your account.");
        clearAuthFlowFromUrl();
        return;
      }

      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: buildAuthRedirectUrl("confirm") },
        });
        if (signUpError) {
          throw signUpError;
        }
        setAuthMessage("Account created. Check your email, confirm your account, then sign in.");
      } else {
        const normalizedEmail = normalizeEmail(email);
        const now = Date.now();
        const previous = loginAttemptsRef.current.get(normalizedEmail) || { attempts: 0, windowStart: now };
        let attempts = Number(previous.attempts) || 0;
        let windowStart = Number(previous.windowStart) || now;

        if (now - windowStart >= LOGIN_RATE_LIMIT_WINDOW_MS) {
          attempts = 0;
          windowStart = now;
        }

        if (attempts >= LOGIN_RATE_LIMIT_MAX) {
          const waitSeconds = Math.ceil((LOGIN_RATE_LIMIT_WINDOW_MS - (now - windowStart)) / 1000);
          throw new Error(`Too many login attempts for this email. Try again in ${waitSeconds} seconds.`);
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          const shouldCountAttempt = /invalid login credentials/i.test(signInError.message || "");
          if (shouldCountAttempt) {
            loginAttemptsRef.current.set(normalizedEmail, { attempts: attempts + 1, windowStart });
          }
          throw signInError;
        }

        loginAttemptsRef.current.delete(normalizedEmail);
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      throw new Error("Enter your email so we can send a reset link.");
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: buildAuthRedirectUrl("recovery"),
    });
    if (resetError) throw resetError;

    loginAttemptsRef.current.delete(normalizeEmail(email));
    setAuthMode("signin");
    setAuthMessage("Password reset email sent. Check your inbox.");
  }

  function handleAuthInput(setter, value) {
    setter(value);
    if (!authError) return;
    window.clearTimeout(authErrorTimerRef.current);
    // SCROLL-ANIM: Once the user resumes typing, stale feedback leaves gently after a short recovery window.
    authErrorTimerRef.current = window.setTimeout(() => setAuthError(""), AUTH_ERROR_DISMISS_MS);
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setAuthMode("forgot");
      setAuthError("");
      setAuthMessage("");
      return;
    }

    if (!supabase) {
      setAuthError("Supabase client is not configured.");
      return;
    }

    setResetBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await sendPasswordReset();
    } catch (err) {
      setAuthError(err.message || "Could not send password reset email.");
    } finally {
      setResetBusy(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setDraft("");
    setRewritten("");
    setLastAiOutput("");
    setLastRewriteSource("provider");
    setContextText("");
    setLearnMessage("");
    setError("");
    setAuthMessage("You have been signed out.");
  }

  if (!authReady) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: tokens.pageBackground, color: tokens.text }}>
        <p style={{ fontSize: 14, color: tokens.muted }}>Loading session...</p>
      </div>
    );
  }

  if (!session?.access_token || isPasswordRecovery) {
    return (
      <div
        className="auth-page"
        ref={landingRef}
        data-theme={theme}
        style={{
          "--page-bg": tokens.pageBackground,
          "--card": tokens.surface,
          "--panel": tokens.surfaceStrong,
          "--text": tokens.text,
          "--muted": tokens.muted,
          "--soft": tokens.soft,
          "--border": tokens.border,
          "--surface": tokens.surface,
          "--surface-strong": tokens.surfaceStrong,
          "--field-bg": tokens.fieldBg,
          "--field-text": tokens.fieldText,
          "--primary-bg": tokens.primaryBg,
          "--primary-text": tokens.primaryText,
          "--secondary-bg": tokens.secondaryBg,
          "--secondary-text": tokens.secondaryText,
          "--placeholder-color": tokens.fieldPlaceholder,
        }}
      >
        <header className="auth-topbar">
          <div className="auth-brand">
            <BrandLogoIcon light={theme === "light"} />
            <span>PhraseAI</span>
          </div>
          <nav className="landing-nav" aria-label="Landing page">
            <a href="#purpose">Why PhraseAI</a>
            <a href="#how-it-works">How it works</a>
            <a href="#get-started">Get started</a>
          </nav>
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <ThemeIcon theme={theme} />
          </button>
        </header>

        {/* REDESIGN: [CHANGED] Premium split-screen auth experience with product storytelling and live rewrite examples. */}
        <div className="auth-hero-stage">
          <motion.main
            className="auth-layout"
            style={{ scale: authHeroScale, opacity: authHeroOpacity, y: authHeroY }}
          >
          <motion.section
            className="auth-story"
            style={{ y: authBackgroundY }}
            {...AUTH_BACKGROUND_MOTION}
          >
            {/* SCROLL-ANIM: Left-panel children enter in a deliberate headline-to-product sequence. */}
            <div className="auth-copy">
              <span className="eyebrow">YOUR VOICE, REFINED</span>
              <h1 className="landing-hero-heading">
                {"Write like yourself. Only better.".split(" ").map((word, index) => (
                  <span className="landing-hero-word" key={`${word}-${index}`}><span>{word}</span></span>
                ))}
              </h1>
              <p>
                PhraseAI turns rough thoughts into clear, confident messages while learning the choices that make your writing yours.
              </p>
              <div className="auth-benefits" aria-label="Product benefits">
                <span><CheckIcon /> Intent preserved</span>
                <span><CheckIcon /> Style learned privately</span>
                <span><CheckIcon /> Ready in seconds</span>
              </div>
            </div>

            {/* SCROLL-ANIM: Cards enter after the copy and retain their own 0.6x parallax layer. */}
            <motion.div className="auth-floating-cards" aria-hidden="true" style={{ y: authCardsY }}>
              <motion.div
                className="auth-floating-cards-entrance"
                variants={AUTH_CARDS_ENTRANCE}
                initial="hidden"
                animate="visible"
              >
                <article className="rewrite-float-card rewrite-float-card-one">
                  <div className="rewrite-card-label"><span>Before</span><span>Quick note</span></div>
                  <p>Hey, just checking if you saw the proposal?</p>
                </article>
                <article className="rewrite-float-card rewrite-float-card-two">
                  <div className="rewrite-card-label"><span><SparkleIcon /> PhraseAI</span><span>Refined</span></div>
                  <p>Hi Maya, I wanted to follow up on the proposal I shared last week.</p>
                </article>
                <article className="rewrite-float-card rewrite-float-card-three">
                  <div className="rewrite-card-label"><span>Style match</span><span>92%</span></div>
                  <p>Clear, warm, and direct. Just like you.</p>
                </article>
              </motion.div>
            </motion.div>

            <div className="auth-preview" aria-hidden="true">
              <div className="preview-toolbar">
                <span className="preview-dot" />
                <span>Personal writing profile</span>
                <span className="preview-status"><SparkleIcon /> Learning</span>
              </div>
              <div className="preview-content">
                <div className="preview-line short" />
                <div className="preview-line" />
                <div className="preview-line medium" />
                <div className="preview-line" />
                <div className="preview-line short" />
              </div>
              <div className="preview-footer">
                <span>{aiInfo?.provider ? `${aiInfo.provider} connected` : "AI workspace"}</span>
                <span>Private by account</span>
              </div>
            </div>
            <div className="landing-scroll-cue" aria-hidden="true"><span>Scroll to explore</span><i /></div>
          </motion.section>

          {/* SCROLL-ANIM: The form panel arrives from the right and remains the natural 1x scroll anchor. */}
          <motion.section className="auth-form-wrap" {...AUTH_PANEL_MOTION}>
            <motion.form
              className="auth-form"
              onSubmit={handleAuthSubmit}
              initial={false}
              animate={authSucceeded ? AUTH_SUCCESS_EXIT : authError ? AUTH_ERROR_SHAKE : AUTH_FORM_REST}
            >
              <motion.div
                className="auth-form-content"
                variants={AUTH_FORM_SEQUENCE}
                initial="hidden"
                animate="visible"
              >
              <motion.div className="auth-form-brand" variants={AUTH_FORM_ITEM}>
                <BrandLogoIcon light />
                <span>PhraseAI</span>
              </motion.div>
              <motion.div className="auth-form-heading" variants={AUTH_FORM_ITEM}>
                <span className="eyebrow">
                  {isPasswordRecovery
                    ? "ACCOUNT RECOVERY"
                    : authMode === "forgot"
                      ? "RESET ACCESS"
                      : authMode === "signin" ? "WELCOME BACK" : "GET STARTED"}
                </span>
                <h2>
                  {isPasswordRecovery
                    ? "Set a new password"
                    : authMode === "forgot"
                      ? "Reset your password"
                      : authMode === "signin" ? "Welcome back" : "Create your workspace"}
                </h2>
                <p>
                  {isPasswordRecovery
                    ? "Choose a secure password to finish recovering your account."
                    : authMode === "forgot"
                      ? "Enter your email and we will send a secure password reset link."
                      : authMode === "signin"
                        ? "Sign in to continue writing at your best"
                        : "Start with a private workspace for your rewrites and style profile."}
                </p>
              </motion.div>

              {!isPasswordRecovery ? (
                <motion.div className="field-group" variants={AUTH_FORM_ITEM}>
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => handleAuthInput(setEmail, event.target.value)}
                    required
                    autoComplete="email"
                    // FIXED: placeholder updated
                    placeholder="Enter your email"
                  />
                </motion.div>
              ) : null}

              {authMode !== "forgot" ? (
              <motion.div className="field-group" variants={AUTH_FORM_ITEM}>
                <div className="field-label-row">
                  <label htmlFor="auth-password">{isPasswordRecovery ? "New password" : "Password"}</label>
                  {authMode === "signin" && !isPasswordRecovery ? (
                    <button type="button" className="text-button" onClick={handleForgotPassword} disabled={resetBusy}>
                      {resetBusy ? "Sending..." : "Forgot password?"}
                    </button>
                  ) : null}
                </div>
                <div className="auth-password-field">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => handleAuthInput(setPassword, event.target.value)}
                    required
                    minLength={8}
                    autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </motion.div>
              ) : null}

              {/* SCROLL-ANIM: Button states crossfade, press physically, and draw the success mark before redirect. */}
              <motion.button
                type="submit"
                className="primary-button auth-submit"
                disabled={authBusy || authSucceeded}
                variants={AUTH_BUTTON_ITEM}
                whileHover={authBusy || authSucceeded ? undefined : AUTH_BUTTON_HOVER}
                whileTap={authBusy || authSucceeded ? undefined : AUTH_BUTTON_TAP}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    className="auth-button-state"
                    key={authSucceeded ? "success" : authBusy ? "loading" : "idle"}
                    {...AUTH_STATE_SWAP}
                  >
                    {authSucceeded ? (
                      <><span>Signed in</span><AnimatedCheckIcon /></>
                    ) : authBusy ? (
                      <><span>{authMode === "forgot" ? "Sending reset link..." : "Signing in..."}</span><span className="button-spinner" /></>
                    ) : (
                      <>
                        <span>
                          {isPasswordRecovery
                            ? "Update password"
                            : authMode === "forgot"
                              ? "Send reset link"
                              : authMode === "signin" ? "Sign in" : "Create account"}
                        </span>
                        <ArrowIcon />
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              {!isPasswordRecovery ? (
                <motion.p className="auth-switch" variants={AUTH_FORM_ITEM}>
                  {authMode === "forgot"
                    ? "Remembered your password?"
                    : authMode === "signin" ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
                      setShowPassword(false);
                      setAuthSucceeded(false);
                      setAuthError("");
                      setAuthMessage("");
                    }}
                  >
                    {authMode === "signin" ? "Sign up" : "Sign in"}
                  </button>
                </motion.p>
              ) : null}

              <motion.div className="auth-message-slot" aria-live="polite" variants={AUTH_FORM_ITEM}>
                <AnimatePresence mode="wait">
                  {authError ? (
                    <motion.p key="auth-error" className="status-message error" {...AUTH_ERROR_MOTION}>
                      {authError}
                    </motion.p>
                  ) : null}
                  {!authError && authMessage ? (
                    <motion.p key="auth-message" className="status-message success" {...AUTH_ERROR_MOTION}>
                      {authMessage}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>
              </motion.div>
            </motion.form>
            <p className="auth-footnote">
              By continuing, you agree to keep account access private. Need help?{" "}
              <a href="mailto:support@phraseai.app">Contact support</a>.
            </p>
          </motion.section>
          </motion.main>
        </div>

        <section
          className="auth-details"
          id="purpose"
          aria-labelledby="auth-details-title"
        >
          <div className="auth-details-inner">
            <header className="auth-details-heading">
              <span className="eyebrow">WRITING THAT SOUNDS LIKE YOU</span>
              <SplitLandingHeading id="auth-details-title">Your thoughts, with the clarity they deserve.</SplitLandingHeading>
              <p>
                PhraseAI helps you communicate with confidence without replacing your personality.
                It refines the message, learns from your choices, and keeps your voice at the center.
              </p>
            </header>

            <div className="auth-purpose-grid">
              <article className="auth-purpose-card auth-purpose-card-featured">
                <span className="auth-card-number">01</span>
                <div className="auth-card-icon"><SparkleIcon /></div>
                <h3>More than a rewrite</h3>
                <p>
                  Improve clarity, tone, and structure while preserving the meaning and personality behind every sentence.
                </p>
              </article>
              <article className="auth-purpose-card">
                <span className="auth-card-number">02</span>
                <div className="auth-card-icon"><ProfileIcon /></div>
                <h3>A style that evolves</h3>
                <p>
                  Each approved rewrite sharpens a private style profile built around your vocabulary, rhythm, and preferences.
                </p>
              </article>
              <article className="auth-purpose-card">
                <span className="auth-card-number">03</span>
                <div className="auth-card-icon"><CheckIcon /></div>
                <h3>Useful from day one</h3>
                <p>
                  Start with any rough email and get a polished version immediately. Your results become more personal over time.
                </p>
              </article>
            </div>

            <div className="auth-how" id="how-it-works">
              <div className="auth-how-copy">
                <span className="eyebrow">HOW IT WORKS</span>
                <SplitLandingHeading>From rough draft to ready to send.</SplitLandingHeading>
                <p>No complicated setup. Just a simple learning loop that gets stronger whenever you use it.</p>
              </div>
              <ol className="auth-how-steps">
                <li>
                  <span>1</span>
                  <div><strong>Write naturally</strong><p>Paste a draft exactly as it comes to mind.</p></div>
                </li>
                <li>
                  <span>2</span>
                  <div><strong>Choose your goal</strong><p>Make it professional, sharper, or simply correct.</p></div>
                </li>
                <li>
                  <span>3</span>
                  <div><strong>Teach through choice</strong><p>Edit, approve, and help PhraseAI understand what sounds right.</p></div>
                </li>
              </ol>
            </div>

            <div className="auth-difference">
              <div>
                <span className="eyebrow">WHY PHRASEAI</span>
                <SplitLandingHeading>AI should amplify your voice, not flatten it.</SplitLandingHeading>
              </div>
              <div className="auth-difference-points">
                <p><CheckIcon /><span><strong>Personal by design.</strong> Your style profile belongs to your account and grows with you.</span></p>
                <p><CheckIcon /><span><strong>Intent stays intact.</strong> The point of your message never gets lost in the polish.</span></p>
                <p><CheckIcon /><span><strong>You stay in control.</strong> Every result is editable, reviewable, and yours to approve.</span></p>
              </div>
            </div>

            <div className="auth-details-cta" id="get-started">
              <div>
                <span className="eyebrow">YOUR VOICE IS THE PRODUCT</span>
                <SplitLandingHeading>Write with less friction and more confidence.</SplitLandingHeading>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Start building your style <ArrowIcon />
              </button>
            </div>
            <footer className="landing-footer">
              <div className="landing-footer-brand">
                <BrandLogoIcon />
                <div><strong>PhraseAI</strong><span>Your voice, refined.</span></div>
              </div>
              <p>Write with clarity without losing what makes the message yours.</p>
              <div className="landing-footer-links">
                <a href="mailto:support@phraseai.app">Support</a>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top</button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    );
  }

  function renderHome() {
    return (
      <div className="composer-workspace">
        <motion.section className="composer-panel input-panel" whileHover={APP_PANEL_HOVER}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ORIGINAL</span>
              <h2>What do you want to say?</h2>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (draft) {
                  setDraft("");
                  setRewritten("");
                  setLastAiOutput("");
                } else {
                  setDraft("Hi Sarah, just checking if you had a chance to review the proposal. We need your feedback before Friday so we can keep the launch on track. Thanks!");
                  setMode("more_professional");
                }
              }}
            >
              {draft ? "Clear" : "Use example"}
            </button>
          </div>

          <div className="editor-shell">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  if (rewriteReady && !loading) handleRewrite();
                }
              }}
              maxLength={MAX_DRAFT_CHARS}
              placeholder="Write naturally. A rough draft is perfect..."
              className="composer-textarea themed-textarea"
              aria-label="Email draft"
            />
            <div className="editor-meta">
              <span>{draft.trim() ? `${draft.trim().split(/\s+/).length} words` : "Start typing"}</span>
              <span>{draft.length.toLocaleString()} / {MAX_DRAFT_CHARS.toLocaleString()}</span>
            </div>
          </div>

          <div className="mode-section">
            <div className="section-label-row">
              <span className="section-label">Rewrite style</span>
              <span className="section-hint">Choose one</span>
            </div>
            <div className="mode-control" role="group" aria-label="Rewrite style">
              {MODES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={mode === item.key ? "mode-option active" : "mode-option"}
                  aria-pressed={mode === item.key}
                  onClick={() => setMode(item.key)}
                >
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="context-section">
            <button
              type="button"
              className="context-toggle"
              onClick={() => setShowContext((current) => !current)}
              aria-expanded={showContext}
            >
              <span><span className="plus-mark">{showContext ? "−" : "+"}</span> Add context</span>
              <small>Original email or special instructions</small>
            </button>
            {showContext ? (
              <div className="context-editor">
                <textarea
                  value={contextText}
                  onChange={(event) => setContextText(event.target.value)}
                  maxLength={MAX_CONTEXT_CHARS}
                  placeholder="Paste the message you are replying to, or tell PhraseAI what matters..."
                  className="themed-textarea"
                  aria-label="Optional email context"
                />
                <span>{contextText.length.toLocaleString()} / {MAX_CONTEXT_CHARS.toLocaleString()}</span>
              </div>
            ) : null}
          </div>

          <motion.button
            type="button"
            className="primary-button rewrite-button"
            disabled={loading || !rewriteReady}
            onClick={handleRewrite}
            aria-busy={loading}
            whileTap={APP_BUTTON_TAP}
          >
            {loading ? <span className="button-spinner dark" /> : <SparkleIcon />}
            <span>{loading ? "Refining your message..." : `Rewrite as ${modeLabel}`}</span>
            {!loading ? <kbd>⌘ ↵</kbd> : null}
          </motion.button>

          <div className="message-region" aria-live="polite">
            {error ? <p className={`status-message ${lastRewriteSource === "fallback" ? "warning" : "error"}`}>{error}</p> : null}
            {IS_DEV && lastDiagnostic ? (
              <details className="status-message">
                <summary>Rewrite diagnostic</summary>
                <pre>{JSON.stringify(lastDiagnostic, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        </motion.section>

        <motion.section className="composer-panel output-panel" whileHover={APP_PANEL_HOVER}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">REFINED</span>
              <h2>Your message, still yours.</h2>
            </div>
            {outputReady ? (
              <span className={`source-badge ${lastRewriteSource}`}>
                <span className="source-dot" />
                {lastRewriteSource === "fallback" ? "Local fallback" : "AI rewrite"}
              </span>
            ) : null}
          </div>

          <div className={`editor-shell output-editor ${loading ? "is-loading" : ""}`}>
            {!outputReady && !loading ? (
              <div className="output-empty" aria-hidden="true">
                <span className="empty-icon"><SparkleIcon /></span>
                <strong>Your refined email will appear here</strong>
                <p>PhraseAI keeps your intent, improves clarity, and adapts to the style you choose.</p>
              </div>
            ) : null}
            <textarea
              value={rewritten}
              onChange={(event) => setRewritten(event.target.value)}
              maxLength={MAX_DRAFT_CHARS}
              className="composer-textarea themed-textarea"
              aria-label="Rewritten email"
              disabled={loading}
            />
            {loading ? (
              <div className="output-loading" aria-label="Generating rewrite">
                <span className="loading-line wide" />
                <span className="loading-line" />
                <span className="loading-line medium" />
                <span className="loading-line wide" />
              </div>
            ) : null}
            <div className="editor-meta">
              <span>{outputReady ? `${rewritten.trim().split(/\s+/).length} words` : "Editable after rewrite"}</span>
              <span>{rewritten.length.toLocaleString()} / {MAX_DRAFT_CHARS.toLocaleString()}</span>
            </div>
          </div>

          <div className="output-actions">
            <button type="button" className="secondary-button" onClick={copyResult} disabled={!outputReady}>
              {copyStatus === "Copied" ? <CheckIcon /> : <CopyIcon />}
              <span>{copyStatus}</span>
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleFinalizeVersion}
              disabled={learning || !finalizeReady}
              aria-busy={learning}
            >
              {learning ? <span className="button-spinner dark" /> : <CheckIcon />}
              <span>{learning ? "Saving your style..." : "Use this version"}</span>
            </button>
          </div>

          <div className="message-region" aria-live="polite">
            {learnMessage ? (
              <p className={`status-message ${/saved/i.test(learnMessage) ? "success" : "error"}`}>{learnMessage}</p>
            ) : (
              <p className="learning-hint">Edit the result before saving. PhraseAI learns from the version you approve.</p>
            )}
          </div>
        </motion.section>
      </div>
    );
  }

  function renderHistory() {
    const entries = styleData.emailHistory;
    const normalizedQuery = historyQuery.trim().toLowerCase();
    const feedbackFor = (entry) => typeof entry.feedback === "string"
      ? entry.feedback
      : entry.feedback?.rating || entry.feedback?.style_rating || "";
    const filteredEntries = entries.filter((entry) => {
      const feedback = feedbackFor(entry);
      const matchesFilter = historyFilter === "all"
        || (historyFilter === "unrated" ? !feedback : feedback === historyFilter);
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      const searchable = [entry.original_text, entry.original, entry.draft, entry.final_version, entry.generated_rewrite, entry.rewrite]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
    const ratedCount = entries.filter((entry) => Boolean(feedbackFor(entry))).length;
    const approvedCount = entries.filter((entry) => feedbackFor(entry) === "good").length;
    const learnedTraits = new Set(entries.flatMap((entry) => entry.influenced_traits || entry.traits || [])).size;

    return (
      <div className="style-page style-page-history history-page-rebuild">
        <ScrollScene containerRef={appContentRef} className="history-cinematic-scene" label="Writing memory overview" chapter="01 / MEMORY">
          <motion.section className="history-hero" style={{ y: historyHeroY, scale: historyHeroScale }}>
            <motion.div variants={STYLE_ITEM_MOTION} initial="hidden" animate="visible">
              <span className="eyebrow">YOUR WRITING MEMORY</span>
              <KineticHeading>Every rewrite leaves your voice clearer.</KineticHeading>
              <p>Review the decisions that shaped your profile, compare your drafts, and teach PhraseAI what sounds unmistakably like you.</p>
            </motion.div>
            <motion.div className="history-stat-grid" variants={STYLE_SECTION_MOTION} initial="hidden" animate="visible">
              {[
                [entries.length, "rewrites saved"],
                [ratedCount, "responses rated"],
                [learnedTraits, "traits shaped"],
              ].map(([value, label]) => (
                <motion.div key={label} variants={STYLE_ITEM_MOTION} whileHover={STYLE_CARD_HOVER}>
                  <strong>{value}</strong><span>{label}</span>
                </motion.div>
              ))}
            </motion.div>
            <span className="history-approval-signal"><i style={{ width: `${entries.length ? Math.round((approvedCount / entries.length) * 100) : 0}%` }} />{approvedCount} approved rewrites</span>
          </motion.section>
        </ScrollScene>

        <ScrollMarquee containerRef={appContentRef} items={["Original thought", "Refined voice", "Your decision", "Stronger profile"]} />

        <motion.section className="history-command-bar" style={{ y: historyToolbarY }}>
          <label className="history-search">
            <span>Search</span>
            <input
              type="search"
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Search original or rewritten text"
            />
          </label>
          <div className="history-filter-row" role="group" aria-label="Filter rewrite history">
            {["all", "good", "off", "edited", "unrated"].map((filter) => (
              <button
                type="button"
                key={filter}
                className={historyFilter === filter ? "active" : ""}
                aria-pressed={historyFilter === filter}
                onClick={() => setHistoryFilter(filter)}
              >
                {titleCase(filter)}
              </button>
            ))}
          </div>
          <span className="history-result-count">{filteredEntries.length} of {entries.length}</span>
        </motion.section>

        <motion.div style={{ y: historyFeedY }}>
          <EmailHistoryFeed expanded entriesOverride={filteredEntries} />
        </motion.div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="product-page settings-page">
        <motion.section className="product-page-hero" variants={STYLE_SECTION_MOTION} initial="hidden" animate="visible">
          <motion.div variants={STYLE_ITEM_MOTION}>
            <span className="eyebrow">PERSONAL WORKSPACE</span>
            <h2>Make PhraseAI feel like yours.</h2>
            <p>Choose how the workspace looks and which writing goal should be ready when you begin.</p>
          </motion.div>
          <motion.div className="settings-current" variants={STYLE_ITEM_MOTION}>
            <span className={`theme-orb ${theme}`} />
            <small>Current experience</small>
            <strong>{titleCase(theme)} mode</strong>
          </motion.div>
        </motion.section>

        <div className="product-page-grid">
          <motion.section className="preference-panel preference-panel-wide" {...APP_SECTION_MOTION}>
            <div className="preference-heading"><span>01</span><div><h3>Appearance</h3><p>Set the visual tone of your writing environment.</p></div></div>
            <div className="theme-choice-grid">
              {[{ key: "dark", label: "Midnight", description: "Focused, cinematic, high contrast." }, { key: "light", label: "Paper", description: "Bright, calm, editorial clarity." }].map((item) => {
                const active = theme === item.key;
                return (
                  <motion.button key={item.key} type="button" className={active ? "theme-choice active" : "theme-choice"} onClick={() => setTheme(item.key)} whileHover={{ y: -3 }} whileTap={APP_BUTTON_TAP}>
                    <span className={`theme-preview ${item.key}`}><i /><i /><i /></span>
                    <strong>{item.label}</strong><small>{item.description}</small>
                    <b>{active ? "Selected" : "Choose"}</b>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          <motion.section className="preference-panel" {...APP_SECTION_MOTION}>
            <div className="preference-heading"><span>02</span><div><h3>Default rewrite</h3><p>Choose the goal waiting on your next draft.</p></div></div>
            <div className="default-mode-list">
              {MODES.map((item) => (
                <button type="button" key={item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)}>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span><i>{mode === item.key ? "Ready" : ""}</i>
                </button>
              ))}
            </div>
          </motion.section>

          <motion.section className="preference-panel privacy-panel" {...APP_SECTION_MOTION}>
            <div className="privacy-mark"><CheckIcon /></div>
            <span className="eyebrow">PRIVATE BY DESIGN</span>
            <h3>Your profile stays attached to your account.</h3>
            <p>History, feedback, and learned writing signals remain isolated to your authenticated workspace.</p>
          </motion.section>
        </div>
      </div>
    );
  }

  function EmailHistoryFeed({ expanded = false, entriesOverride = null }) {
    const entries = entriesOverride ?? styleData.emailHistory;
    const isFilteredEmpty = Array.isArray(entriesOverride) && entries.length === 0 && styleData.emailHistory.length > 0;

    if (styleDataLoading) {
      return (
        <section className="style-card history-card" aria-busy="true">
          <div className="style-card-heading">
            <div><span className="eyebrow">EMAIL MEMORY</span><h2>Recent writing</h2></div>
          </div>
          <div className="history-skeleton" aria-label="Loading email history">
            {[0, 1, 2].map((item) => <span key={item} />)}
          </div>
        </section>
      );
    }

    return (
      <section className={`style-card history-card ${expanded ? "history-card-expanded" : ""}`}>
        <div className="style-card-heading">
          <div>
            <span className="eyebrow">EMAIL MEMORY</span>
            <h2>{expanded ? "Your rewrite history" : "Recent writing"}</h2>
            <p>Rate finished rewrites so your profile keeps learning what sounds right.</p>
          </div>
          {!expanded ? (
            <button type="button" className="text-action" onClick={() => setActiveSection("history")}>
              View all
            </button>
          ) : null}
        </div>

        {styleDataError ? (
          <div className="style-state style-state-error">
            <strong>History is temporarily unavailable.</strong>
            <p>{styleDataError}</p>
            <button type="button" className="secondary-button" onClick={() => loadStyleData()}>Try again</button>
          </div>
        ) : entries.length === 0 ? (
          <div className="style-state">
            <span className="style-state-mark"><HistoryIcon /></span>
            <strong>{isFilteredEmpty ? "No rewrites match this view" : "No finalized emails yet"}</strong>
            <p>{isFilteredEmpty ? "Try another search or feedback filter." : "Use a rewritten version and it will appear here with the traits it helped shape."}</p>
            {isFilteredEmpty ? (
              <button type="button" className="secondary-button" onClick={() => { setHistoryQuery(""); setHistoryFilter("all"); }}>Clear filters</button>
            ) : (
              <button type="button" className="secondary-button" onClick={() => setActiveSection("home")}>Write your first email</button>
            )}
          </div>
        ) : (
          <div className="email-history-scroll">
            {entries.map((entry, index) => {
              const id = entry.id ?? index;
              const original = entry.original_text || entry.original || entry.draft || "";
              const rewrite = entry.final_version || entry.generated_rewrite || entry.rewrite || entry.final || "";
              const traits = entry.influenced_traits || entry.traits || [];
              const feedback = typeof entry.feedback === "string"
                ? entry.feedback
                : entry.feedback?.rating || entry.feedback?.style_rating || "";
              const rowId = String(id);
              const busy = Boolean(feedbackBusyIds[rowId]);
              const feedbackMessage = feedbackMessages[rowId];
              const expandedOriginal = Boolean(expandedHistoryIds[rowId]);
              const editingManual = Boolean(manualEditIds[rowId]);
              const manualDraft = manualEditDrafts[rowId] ?? rewrite;

              return (
                <motion.article
                  className="email-history-item"
                  key={id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={STYLE_SECTION_VIEWPORT}
                  transition={{ duration: 0.38, delay: Math.min(index * 0.04, 0.18), ease: AUTH_EASE_OUT }}
                >
                  <div className="email-history-meta">
                    <span><b>#{String(styleData.emailHistory.indexOf(entry) + 1).padStart(2, "0")}</b>{formatDate(entry.finalized_at || entry.submitted_at || entry.created_at)}</span>
                    <span className={`history-learning-state ${feedback || "unrated"}`}>{feedback ? titleCase(feedback) : "Awaiting feedback"}</span>
                  </div>
                  <div className="email-compare">
                    <div>
                      <span className="email-compare-label">Original</span>
                      <p className={expandedOriginal ? "expanded" : ""}>{original || "Original text unavailable."}</p>
                      {original.length > 160 ? (
                        <button
                          type="button"
                          className="text-action tiny"
                          onClick={() => setExpandedHistoryIds((current) => ({ ...current, [rowId]: !expandedOriginal }))}
                        >
                          {expandedOriginal ? "Collapse" : "Expand original"}
                        </button>
                      ) : null}
                    </div>
                    <div className="email-rewrite">
                      <span className="email-compare-label">Your version</span>
                      <p>{rewrite || "Final rewrite unavailable."}</p>
                    </div>
                  </div>
                  {traits.length ? (
                    <div className="trait-chip-row" aria-label="Influenced traits">
                      {traits.map((trait, traitIndex) => (
                        <span className="trait-chip" key={`${trait}-${traitIndex}`}>{titleCase(trait)}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="history-feedback">
                    <span>Did this sound like you?</span>
                    <div role="group" aria-label={`Rate rewrite from ${formatDate(entry.finalized_at || entry.submitted_at)}`}>
                      <button
                        type="button"
                        className={feedback === "good" ? "feedback-button active" : "feedback-button"}
                        disabled={busy}
                        aria-pressed={feedback === "good"}
                        onClick={() => handleHistoryFeedback(id, "good")}
                      >
                        <CheckIcon /> Good
                      </button>
                      <button
                        type="button"
                        className={feedback === "off" ? "feedback-button off active" : "feedback-button off"}
                        disabled={busy}
                        aria-pressed={feedback === "off"}
                        onClick={() => handleHistoryFeedback(id, "off")}
                      >
                        <span aria-hidden="true">×</span> Off
                      </button>
                      <button
                        type="button"
                        className={feedback === "edited" ? "feedback-button active" : "feedback-button"}
                        disabled={busy}
                        aria-pressed={feedback === "edited"}
                        onClick={() => {
                          setManualEditDrafts((current) => ({ ...current, [rowId]: manualDraft }));
                          setManualEditIds((current) => ({ ...current, [rowId]: !editingManual }));
                        }}
                      >
                        ✎ I'd write it like this
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {editingManual ? (
                      <motion.div
                        className="manual-edit-box"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: AUTH_EASE_OUT }}
                      >
                        <textarea
                          value={manualDraft}
                          onChange={(event) => setManualEditDrafts((current) => ({ ...current, [rowId]: event.target.value }))}
                          aria-label="Edit rewrite in your own voice"
                        />
                        <div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setManualEditIds((current) => ({ ...current, [rowId]: false }))}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={busy || !manualDraft.trim()}
                            onClick={() => handleHistoryFeedback(id, "edited", { manual_edit: manualDraft })}
                          >
                            Save edit
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  {feedbackMessage ? (
                    <p
                      className="history-feedback-message"
                      role={feedbackMessage.type === "error" ? "alert" : "status"}
                      style={feedbackMessage.type === "error" ? { color: "#f08b78" } : undefined}
                    >
                      {feedbackMessage.text}
                    </p>
                  ) : null}
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderStyleProfile() {
    const snapshots = styleData.personaSnapshots;
    const selectedIndex = snapshots.findIndex((snapshot, index) =>
      String(snapshot.id ?? index) === selectedSnapshotId);
    const selectedSnapshot = snapshots[selectedIndex >= 0 ? selectedIndex : snapshots.length - 1];
    const displayStyle = selectedSnapshot?.style || selectedSnapshot?.current_style || styleData.currentStyle;
    const traits = getPersonaTraits(displayStyle, styleData.styleTags);
    const traitCards = getTraitCards(displayStyle);
    const learnedExamples = Number(styleData.emailsAnalyzed || styleData.currentStyle?.stats?.learned_examples || styleData.emailHistory.length || 0);
    const strengthPercent = Math.round(styleData.styleStrength * 100);
    const personaLabel = selectedSnapshot?.persona_label || displayStyle?.persona_label || styleData.personaLabel || "Emerging Voice";
    const summary = buildPersonaSummary(displayStyle, selectedSnapshot ? "" : styleData.personaSummary);
    const hasPersona = traits.length > 0 || learnedExamples > 0 || snapshots.length > 0;
    const firstCompleteness = Number(snapshots[0]?.completeness || 0);
    const growth = Math.max(0, Math.round((styleData.styleStrength - firstCompleteness) * 100));
    const strengthCopy = strengthPercent < 30
      ? "Submit a few more emails to get started."
      : strengthPercent < 60
        ? "Your profile is taking shape — keep going."
        : strengthPercent < 85
          ? "Strong profile — rewrites are getting very accurate."
          : "Your style is well defined. PhraseAI knows you.";
    const feedbackEvents = styleData.feedbackEvents || [];

    // FRONTEND: The profile combines map, confidence, evolution, summary, and feedback history in one responsive workspace.
    return (
      <div className="style-page style-page-rebuild">
        {styleDataLoading ? (
          <div className="style-profile-loading" aria-label="Loading style profile">
            <span /><span /><span />
          </div>
        ) : styleDataError && !hasPersona && styleData.emailHistory.length === 0 ? (
          <div className="style-state style-state-error style-state-page">
            <strong>We could not load your Style Profile.</strong>
            <p>{styleDataError}</p>
            <button type="button" className="primary-button" onClick={() => loadStyleData()}>Try again</button>
          </div>
        ) : !hasPersona ? (
          <div className="style-state style-state-page">
            <span className="style-state-mark"><SparkleIcon /></span>
            <strong>Your voice starts with one finished rewrite</strong>
            <p>PhraseAI builds this profile only from emails you finalize while signed in.</p>
            <button type="button" className="primary-button" onClick={() => setActiveSection("home")}>Create a rewrite</button>
          </div>
        ) : (
          <>
            <ScrollScene containerRef={appContentRef} className="persona-cinematic-scene" label="Current writing persona" chapter="01 / PERSONA">
              <StyleSection className="style-profile-hero" style={{ y: styleHeroY, scale: styleHeroScale, opacity: styleHeroOpacity }}>
                <motion.div variants={STYLE_ITEM_MOTION}>
                  <span className="eyebrow">CLIENT PERSONA</span>
                  <KineticHeading>{personaLabel}</KineticHeading>
                  <p>{summary}</p>
                  <div className="trait-chip-row">
                    {traits.slice(0, 6).map((trait) => (
                      <span className="trait-chip" key={trait.label}>{titleCase(trait.label)}</span>
                    ))}
                  </div>
                </motion.div>
                <motion.div variants={STYLE_ITEM_MOTION} className="profile-ring-panel">
                  <CompletenessRing value={styleData.styleStrength} />
                  <small>Based on {learnedExamples} emails analyzed</small>
                </motion.div>
              </StyleSection>
            </ScrollScene>

            <ScrollMarquee containerRef={appContentRef} items={traits.slice(0, 5).map((trait) => titleCase(trait.label))} />

            <ScrollScene containerRef={appContentRef} className="map-cinematic-scene" label="Interactive writing style map" chapter="02 / SIGNALS">
              <StyleSection className="style-hero-grid style-depth-grid">
                <motion.div className="style-card persona-map-card" variants={STYLE_ITEM_MOTION} style={{ y: styleMapY }} whileHover={STYLE_CARD_HOVER}>
                <div className="style-card-heading">
                  <div>
                    <span className="eyebrow">MENTAL MAP</span>
                    <h2>Your voice, alive</h2>
                    <p>Node size tracks confidence. Green intensity tracks trait strength. Click a node for details.</p>
                  </div>
                  <span className="live-profile-badge"><span /> Live profile</span>
                </div>
                <div className="persona-map-wrap">
                  <PersonaMap initials={accountInitials} traits={traits} personaLabel={personaLabel} onSelectTrait={setSelectedTrait} />
                </div>
                <AnimatePresence>
                  {selectedTrait ? <TraitDrawer trait={selectedTrait} onClose={() => setSelectedTrait(null)} /> : null}
                </AnimatePresence>
                </motion.div>

                <motion.div className="style-side-stack" style={{ y: styleSideY }}>
                <motion.section className="style-card strength-card sticky-strength-card" variants={STYLE_ITEM_MOTION} whileHover={STYLE_CARD_HOVER}>
                  <div className="strength-heading">
                    <div>
                      <span className="eyebrow">STYLE STRENGTH</span>
                      <h2>Your style profile is {strengthPercent}% complete</h2>
                    </div>
                    <strong>{learnedExamples}</strong>
                  </div>
                  <CompletenessRing value={styleData.styleStrength} label="profile" />
                  <p>{strengthCopy}</p>
                </motion.section>

                <motion.section className="style-card feedback-impact-card" variants={STYLE_ITEM_MOTION} whileHover={STYLE_CARD_HOVER}>
                  <div className="strength-heading">
                    <div>
                      <span className="eyebrow">FEEDBACK IMPACT</span>
                      <h2>{feedbackEvents.length} trait adjustments</h2>
                    </div>
                  </div>
                  {feedbackEvents.length ? (
                    <ul>
                      {feedbackEvents.slice(0, 5).map((event) => (
                        <li key={event.id || `${event.rewrite_id}-${event.created_at}`}>
                          <span>{titleCase(event.feedback_type)}</span>
                          <p>{event.feedback_type === "off" ? "nudged dominant trait confidence down." : event.feedback_type === "edited" ? "retrained from your manual correction." : "reinforced the traits behind that rewrite."}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Rate a rewrite and this will show exactly how your feedback changed the profile.</p>
                  )}
                </motion.section>
                </motion.div>
              </StyleSection>
            </ScrollScene>

            <ScrollScene containerRef={appContentRef} className="evolution-cinematic-scene" label="Writing style evolution" chapter="03 / EVOLUTION">
              <StyleSection className="style-card evolution-card" style={{ y: styleTimelineY }}>
              <div className="style-card-heading">
                <div>
                  <span className="eyebrow">EVOLUTION</span>
                  <h2>Your profile is growing</h2>
                  <p>{snapshots.length >= 3 ? `Your profile is ${growth}% more defined than when you started.` : "Submit more emails to see your style evolve."}</p>
                </div>
                <span className="timeline-count">{snapshots.length} snapshots</span>
              </div>
              {snapshots.length >= 3 ? (
                <div className="timeline-scroll">
                  <div className="timeline-track" role="list" aria-label="Persona evolution timeline">
                    {snapshots.map((snapshot, index) => {
                      const id = String(snapshot.id ?? index);
                      const active = id === selectedSnapshotId || (!selectedSnapshotId && index === snapshots.length - 1);
                      const completeness = Math.round(Number(snapshot.completeness || 0) * 100);
                      return (
                        <button
                          type="button"
                          role="listitem"
                          className={active ? "timeline-stop active" : "timeline-stop"}
                          key={id}
                          onClick={() => setSelectedSnapshotId(id)}
                          aria-pressed={active}
                        >
                          <span className="timeline-dot" />
                          <strong>{index === snapshots.length - 1 ? "Now" : formatDate(snapshot.captured_at || snapshot.created_at, { short: true })}</strong>
                          <small>{completeness ? `${completeness}% complete` : `Version ${index + 1}`} · {snapshot.persona_label || "Persona"}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="timeline-empty">Submit more emails to see your style evolve. Timeline unlocks after 3 snapshots.</div>
              )}
              </StyleSection>
            </ScrollScene>

            <StyleSection className="style-card trait-breakdown-section" style={{ y: styleTraitsY }}>
              <div className="style-card-heading">
                <div>
                  <span className="eyebrow">TRAIT BREAKDOWN</span>
                  <h2>The dimensions PhraseAI is tracking</h2>
                  <p>Each card shows score, confidence, and direction of movement.</p>
                </div>
              </div>
              <div className="trait-breakdown-grid">
                {traitCards.map((trait) => <TraitBreakdownCard trait={trait} key={trait.key} />)}
              </div>
            </StyleSection>

            <EmailHistoryFeed />
          </>
        )}

        {IS_DEV ? (
          <section className="style-card dev-style-card">
            <span className="eyebrow">DEVELOPER</span>
            <button type="button" onClick={runStressTest} disabled={stressLoading} className="secondary-button">
              {stressLoading ? "Running stress test..." : "Run stress-test learning"}
            </button>
            {stressMessage ? <p>{stressMessage}</p> : null}
          </section>
        ) : null}
      </div>
    );
  }

  function renderAccount() {
    const metadata = session?.user?.user_metadata || {};
    const accountCreated = session?.user?.created_at ? new Date(session.user.created_at).toLocaleString() : "Unknown";

    return (
      <div className="product-page account-page">
        <motion.section className="account-hero" variants={STYLE_SECTION_MOTION} initial="hidden" animate="visible">
          <motion.div className="account-hero-avatar" variants={STYLE_ITEM_MOTION}>{accountInitials}</motion.div>
          <motion.div variants={STYLE_ITEM_MOTION}><span className="eyebrow">PHRASEAI MEMBER</span><h2>{metadata.full_name || metadata.name || session?.user?.email?.split("@")[0] || "Your account"}</h2><p>{session?.user?.email || "Email unavailable"}</p></motion.div>
          <motion.span className="account-status" variants={STYLE_ITEM_MOTION}><i /> Secure session</motion.span>
        </motion.section>

        <div className="account-detail-grid">
          <motion.section className="account-detail-card" {...APP_SECTION_MOTION}><span>EMAIL ADDRESS</span><strong>{session?.user?.email || "Unknown"}</strong><p>Used for secure access and account recovery.</p></motion.section>
          <motion.section className="account-detail-card" {...APP_SECTION_MOTION}><span>MEMBER SINCE</span><strong>{accountCreated}</strong><p>Your writing profile has been evolving since this date.</p></motion.section>
          <motion.section className="account-detail-card account-id-card" {...APP_SECTION_MOTION}><span>ACCOUNT ID</span><strong>{session?.user?.id || "Unavailable"}</strong><p>A private identifier used to isolate your PhraseAI data.</p></motion.section>
        </div>

        <motion.section className="account-actions-panel" {...APP_SECTION_MOTION}>
          <div><span className="eyebrow">SESSION CONTROL</span><h3>You are signed in securely.</h3><p>Return to your workspace or end this session on the current device.</p></div>
          <div className="account-actions">
            <button type="button" className="secondary-button" onClick={() => setActiveSection("home")}>Back to Workspace</button>
            <button type="button" className="account-signout" onClick={handleSignOut}>Sign out</button>
          </div>
        </motion.section>
      </div>
    );
  }

  const sectionOrder = ["home", "history", "style-profile", "settings", "account"];
  const sectionPosition = String(sectionOrder.indexOf(activeSection) + 1).padStart(2, "0");
  const sectionTotal = String(sectionOrder.length).padStart(2, "0");

  const sectionMeta = {
    home: { title: "Rewrite Emails In Your Voice", sub: "Pick a mode, generate a stronger draft, and refine it inline." },
    history: { title: "Rewrite History", sub: "Compare originals, final versions, and the traits each email shaped." },
    settings: { title: "App Preferences", sub: "Choose the visual mode for the whole app." },
    "style-profile": { title: "Style Profile", sub: "See what PhraseAI has learned from the writing choices you approve." },
    account: { title: "Account", sub: "Manage your personal information and session." },
  };
  const currentMeta = sectionMeta[activeSection] || sectionMeta.home;

  return (
    <div
      className="app-shell"
      data-theme={theme}
      style={{
        colorScheme: theme,
        "--page-bg": tokens.pageBackground,
        "--card": tokens.surface,
        "--panel": tokens.surfaceStrong,
        "--text": tokens.text,
        "--muted": tokens.muted,
        "--soft": tokens.soft,
        "--border": tokens.border,
        "--surface": tokens.surface,
        "--surface-strong": tokens.surfaceStrong,
        "--field-bg": tokens.fieldBg,
        "--field-text": tokens.fieldText,
        "--primary-bg": tokens.primaryBg,
        "--primary-text": tokens.primaryText,
        "--secondary-bg": tokens.secondaryBg,
        "--secondary-text": tokens.secondaryText,
        "--active-bg": tokens.activeNavBg,
        "--active-text": tokens.activeNavText,
        "--badge-bg": tokens.badgeBg,
        "--badge-border": tokens.badgeBorder,
        "--placeholder-color": tokens.fieldPlaceholder,
      }}
    >
      <motion.aside
        className="app-sidebar"
        {...APP_SIDEBAR_MOTION}
      >
        <div className="sidebar-brand">
          <BrandLogoIcon light={theme === "light"} />
          <div className="sidebar-brand-copy">
            <strong>PhraseAI</strong>
            <span>Writing workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.key;
            return (
              <motion.button
                key={item.key}
                type="button"
                className={active ? "sidebar-link active" : "sidebar-link"}
                onClick={() => setActiveSection(item.key)}
                aria-current={active ? "page" : undefined}
                title={item.label}
                whileHover={{ x: 4, transition: { duration: 0.2, ease: AUTH_EASE_OUT } }}
                whileTap={APP_BUTTON_TAP}
              >
                <Icon />
                <span className="sidebar-link-copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </motion.button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <motion.button
            type="button"
            className={isSettings ? "sidebar-link active" : "sidebar-link"}
            onClick={() => setActiveSection("settings")}
            aria-current={isSettings ? "page" : undefined}
            title="Settings"
            whileHover={{ x: 4, transition: { duration: 0.2, ease: AUTH_EASE_OUT } }}
            whileTap={APP_BUTTON_TAP}
          >
            <SettingsIcon />
            <span className="sidebar-link-copy">
              <strong>Settings</strong>
              <small>Theme and preferences</small>
            </span>
          </motion.button>

          <motion.button
            type="button"
            className={isAccount ? "account-button active" : "account-button"}
            onClick={() => setActiveSection("account")}
            title={`${accountName} (account settings)`}
            aria-label="Account"
            whileHover={{ x: 4, transition: { duration: 0.2, ease: AUTH_EASE_OUT } }}
            whileTap={APP_BUTTON_TAP}
          >
            <span className="account-avatar">{accountInitials}</span>
            <span className="account-copy">
              <strong>{session?.user?.email?.split("@")[0] || "Account"}</strong>
              <small>Manage account</small>
            </span>
          </motion.button>
        </div>
      </motion.aside>

      <main
        className="app-main"
      >
        <motion.div className="app-scroll-atmosphere" style={{ y: appAmbientY, rotate: appAmbientRotate }} aria-hidden="true" />
        <motion.div className="app-header-motion" style={{ y: appHeaderY, opacity: appHeaderOpacity }}>
          <motion.header className="app-header" {...APP_HEADER_MOTION}>
            <div className="app-header-row">
              <div className="app-header-copy">
                <span className="eyebrow">{activeSection === "home" ? "WORKSPACE" : activeSection.replace("-", " ").toUpperCase()}</span>
                <h1>{currentMeta.title}</h1>
                <p>{currentMeta.sub}</p>
              </div>
            <div className="app-header-actions">
                <span className="app-section-number"><b>{sectionPosition}</b> / {sectionTotal}</span>
                {aiInfo?.model ? (
                  <span className="model-status" title={aiInfo.model}>
                    <span />
                    {aiInfo.provider || "AI"} online
                  </span>
                ) : null}
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  <ThemeIcon theme={theme} />
                </button>
                <button
                  type="button"
                  className="header-signout"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </div>
          </motion.header>
        </motion.div>

        <div className="app-content" ref={appContentRef}>
          <motion.div className="app-scroll-progress" style={{ scaleX: smoothAppScrollProgress }} aria-hidden="true" />
          <div className="app-scroll-compass" aria-hidden="true">
            <span>{activeSection.replace("-", " ")}</span>
            <i><motion.b style={{ scaleY: smoothAppScrollProgress }} /></i>
          </div>
          <AnimatePresence mode="wait">
            <motion.div className="app-section-frame" key={activeSection} {...APP_SECTION_MOTION}>
              <motion.div className="app-scroll-plane" style={{ y: appPlaneY, scale: appPlaneScale }}>
                {isHome ? renderHome() : null}
                {isHistory ? renderHistory() : null}
                {isSettings ? renderSettings() : null}
                {isStyleProfile ? renderStyleProfile() : null}
                {isAccount ? renderAccount() : null}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
