import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { validateRewriteResponse } from "./rewriteResponse";

// ARCHITECT: [RECOMMENDED PATTERN] Production uses the same-origin Vercel proxy, avoiding CORS as a rewrite dependency.
const API_URL = import.meta.env.DEV ? import.meta.env.VITE_API_URL || "/api" : "/api";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
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
    styleTags: Array.isArray(styleTags) ? styleTags : [],
    styleStrength: Number.isFinite(normalizedStrength)
      ? Math.max(0, Math.min(1, normalizedStrength > 1 ? normalizedStrength / 100 : normalizedStrength))
      : 0,
    lastUpdated: payload.last_updated || payload.updated_at || currentStyle?.stats?.last_learned_at || "",
    personaSummary: payload.persona_summary || payload.summary || "",
  };
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
  const learnedTraits = Object.entries(style.traits || {}).map(([key, trait]) => ({
    label:
      key === "tone_formal_casual"
        ? trait?.value
        : key === "average_sentence_length"
          ? "sentence rhythm"
          : key === "vocabulary_richness"
            ? "word variety"
            : key === "punctuation_patterns"
              ? "punctuation"
              : key === "preferred_openers"
                ? "openings"
                : key === "preferred_closers"
                  ? "sign-offs"
                  : key === "top_recurring_phrases"
                    ? "signature phrases"
                    : key,
    category: key,
    confidence: trait?.confidence,
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
      return {
        label,
        category: value.category || "trait",
        confidence: Number.isFinite(confidence)
          ? Math.max(0.2, Math.min(1, confidence > 1 ? confidence / 100 : confidence))
          : 0.6,
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

function PersonaMap({ initials, traits }) {
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
        <g key={`${node.label}-${index}`}>
          <line
            className="persona-edge"
            x1="210"
            y1="155"
            x2={node.x}
            y2={node.y}
            style={{ opacity: 0.18 + node.confidence * 0.68, strokeWidth: 0.8 + node.confidence * 2.2 }}
          />
          <circle
            className="persona-node-halo"
            cx={node.x}
            cy={node.y}
            r={24 + node.confidence * 5}
            style={{ opacity: 0.06 + node.confidence * 0.08 }}
          />
          <circle className="persona-node" cx={node.x} cy={node.y} r={4.5 + node.confidence * 2.5} />
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
        </g>
      ))}
      <circle className="persona-core-glow" cx="210" cy="155" r="42" filter="url(#personaGlow)" />
      <circle className="persona-core" cx="210" cy="155" r="34" fill="url(#personaCore)" />
      <text className="persona-initials" x="210" y="161" textAnchor="middle">{initials}</text>
    </svg>
  );
}

function App() {
  const authErrorTimerRef = useRef(null);
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
    let mounted = true;

    async function bootstrapAuth() {
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
  async function handleHistoryFeedback(entryId, rating) {
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
              },
            }
          : entry),
    }));

    try {
      const response = await apiFetch(`/email-history/${encodeURIComponent(entryId)}/feedback`, {
        method: "POST",
        body: JSON.stringify({ rating }),
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
          text: rating === "good" ? "Saved as a good match." : "Saved. PhraseAI will adjust.",
        },
      }));
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
      if (isPasswordRecovery || authMode === "recovery") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setIsPasswordRecovery(false);
        setAuthMode("signin");
        setAuthMessage("Password updated. You can continue with your account.");
        return;
      }

      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          throw signUpError;
        }
        setAuthMessage("Account created. Check your email for confirmation if required, then sign in.");
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

  function handleAuthInput(setter, value) {
    setter(value);
    if (!authError) return;
    window.clearTimeout(authErrorTimerRef.current);
    // SCROLL-ANIM: Once the user resumes typing, stale feedback leaves gently after a short recovery window.
    authErrorTimerRef.current = window.setTimeout(() => setAuthError(""), AUTH_ERROR_DISMISS_MS);
  }

  async function handleForgotPassword() {
    if (!supabase) {
      setAuthError("Supabase client is not configured.");
      return;
    }

    if (!email.trim()) {
      setAuthError("Enter your email first, then use forgot password.");
      return;
    }

    setResetBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetError) {
        throw resetError;
      }

      loginAttemptsRef.current.delete(normalizeEmail(email));
      setAuthMessage("Password reset email sent. Check your inbox.");
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
            <motion.div className="auth-copy" variants={AUTH_LEFT_SEQUENCE} initial="hidden" animate="visible">
              <motion.span className="eyebrow" variants={AUTH_LEFT_ITEM}>YOUR VOICE, REFINED</motion.span>
              <motion.h1 variants={AUTH_LEFT_ITEM}>Write like yourself. Only better.</motion.h1>
              <motion.p variants={AUTH_LEFT_ITEM}>
                PhraseAI turns rough thoughts into clear, confident messages while learning the choices that make your writing yours.
              </motion.p>
              <motion.div className="auth-benefits" aria-label="Product benefits" variants={AUTH_LEFT_ITEM}>
                <span><CheckIcon /> Intent preserved</span>
                <span><CheckIcon /> Style learned privately</span>
                <span><CheckIcon /> Ready in seconds</span>
              </motion.div>
            </motion.div>

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
                <span className="eyebrow">{isPasswordRecovery ? "ACCOUNT RECOVERY" : authMode === "signin" ? "WELCOME BACK" : "GET STARTED"}</span>
                <h2>{isPasswordRecovery ? "Set a new password" : authMode === "signin" ? "Welcome back" : "Create your workspace"}</h2>
                <p>
                  {isPasswordRecovery
                    ? "Choose a secure password to finish recovering your account."
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
                      <><span>Signing in...</span><span className="button-spinner" /></>
                    ) : (
                      <>
                        <span>{isPasswordRecovery ? "Update password" : authMode === "signin" ? "Sign in" : "Create account"}</span>
                        <ArrowIcon />
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              {!isPasswordRecovery ? (
                <motion.p className="auth-switch" variants={AUTH_FORM_ITEM}>
                  {authMode === "signin" ? "Don't have an account?" : "Already have an account?"}
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

        <motion.section
          className="auth-details"
          aria-labelledby="auth-details-title"
          style={{ y: authDetailsY, scale: authDetailsScale, rotate: authDetailsRotate }}
        >
          <motion.div
            className="auth-details-inner"
            variants={AUTH_DETAILS_SEQUENCE}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
          >
            <motion.header className="auth-details-heading" variants={AUTH_DETAILS_ITEM}>
              <span className="eyebrow">WRITING THAT SOUNDS LIKE YOU</span>
              <h2 id="auth-details-title">Your thoughts, with the clarity they deserve.</h2>
              <p>
                PhraseAI helps you communicate with confidence without replacing your personality.
                It refines the message, learns from your choices, and keeps your voice at the center.
              </p>
            </motion.header>

            <motion.div className="auth-purpose-grid" variants={AUTH_DETAILS_SEQUENCE}>
              <motion.article className="auth-purpose-card auth-purpose-card-featured" variants={AUTH_DETAILS_ITEM}>
                <span className="auth-card-number">01</span>
                <div className="auth-card-icon"><SparkleIcon /></div>
                <h3>More than a rewrite</h3>
                <p>
                  Improve clarity, tone, and structure while preserving the meaning and personality behind every sentence.
                </p>
              </motion.article>
              <motion.article className="auth-purpose-card" variants={AUTH_DETAILS_ITEM}>
                <span className="auth-card-number">02</span>
                <div className="auth-card-icon"><ProfileIcon /></div>
                <h3>A style that evolves</h3>
                <p>
                  Each approved rewrite sharpens a private style profile built around your vocabulary, rhythm, and preferences.
                </p>
              </motion.article>
              <motion.article className="auth-purpose-card" variants={AUTH_DETAILS_ITEM}>
                <span className="auth-card-number">03</span>
                <div className="auth-card-icon"><CheckIcon /></div>
                <h3>Useful from day one</h3>
                <p>
                  Start with any rough email and get a polished version immediately. Your results become more personal over time.
                </p>
              </motion.article>
            </motion.div>

            <motion.div className="auth-how" variants={AUTH_DETAILS_ITEM}>
              <div className="auth-how-copy">
                <span className="eyebrow">HOW IT WORKS</span>
                <h2>From rough draft to ready to send.</h2>
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
            </motion.div>

            <motion.div className="auth-difference" variants={AUTH_DETAILS_ITEM}>
              <div>
                <span className="eyebrow">WHY PHRASEAI</span>
                <h2>AI should amplify your voice, not flatten it.</h2>
              </div>
              <div className="auth-difference-points">
                <p><CheckIcon /><span><strong>Personal by design.</strong> Your style profile belongs to your account and grows with you.</span></p>
                <p><CheckIcon /><span><strong>Intent stays intact.</strong> The point of your message never gets lost in the polish.</span></p>
                <p><CheckIcon /><span><strong>You stay in control.</strong> Every result is editable, reviewable, and yours to approve.</span></p>
              </div>
            </motion.div>

            <motion.div className="auth-details-cta" variants={AUTH_DETAILS_ITEM}>
              <div>
                <span className="eyebrow">YOUR VOICE IS THE PRODUCT</span>
                <h2>Write with less friction and more confidence.</h2>
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
            </motion.div>
          </motion.div>
        </motion.section>
      </div>
    );
  }

  function renderHome() {
    return (
      <div className="composer-workspace">
        <section className="composer-panel input-panel">
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

          <button
            type="button"
            className="primary-button rewrite-button"
            disabled={loading || !rewriteReady}
            onClick={handleRewrite}
            aria-busy={loading}
          >
            {loading ? <span className="button-spinner dark" /> : <SparkleIcon />}
            <span>{loading ? "Refining your message..." : `Rewrite as ${modeLabel}`}</span>
            {!loading ? <kbd>⌘ ↵</kbd> : null}
          </button>

          <div className="message-region" aria-live="polite">
            {error ? <p className={`status-message ${lastRewriteSource === "fallback" ? "warning" : "error"}`}>{error}</p> : null}
            {IS_DEV && lastDiagnostic ? (
              <details className="status-message">
                <summary>Rewrite diagnostic</summary>
                <pre>{JSON.stringify(lastDiagnostic, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        </section>

        <section className="composer-panel output-panel">
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
        </section>
      </div>
    );
  }

  function renderHistory() {
    // FRONTEND: Keep the history route useful by rendering the same durable email records as Style Profile.
    return (
      <div className="style-page style-page-history">
        <EmailHistoryFeed expanded />
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="rounded-2xl border p-6" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { key: "dark", label: "Dark", description: "High contrast dark workspace." },
            { key: "light", label: "Light", description: "Bright paper-like workspace." },
          ].map((item) => {
            const active = theme === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTheme(item.key)}
                className="rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer"
                style={
                  active
                    ? { backgroundColor: tokens.activeNavBg, color: tokens.activeNavText, borderColor: tokens.activeNavBg }
                    : { backgroundColor: tokens.inactiveNavBg, color: tokens.text, borderColor: tokens.border }
                }
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs" style={{ color: active ? tokens.activeNavMeta : tokens.muted }}>
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-xs" style={{ color: tokens.muted }}>
          Theme changes are applied instantly for this session.
        </p>
      </div>
    );
  }

  function EmailHistoryFeed({ expanded = false }) {
    const entries = styleData.emailHistory;

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
            <strong>No finalized emails yet</strong>
            <p>Use a rewritten version and it will appear here with the traits it helped shape.</p>
            <button type="button" className="secondary-button" onClick={() => setActiveSection("home")}>Write your first email</button>
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

              return (
                <article className="email-history-item" key={id}>
                  <div className="email-history-meta">
                    <span>{formatDate(entry.finalized_at || entry.submitted_at || entry.created_at)}</span>
                    {traits.length ? <span>{traits.length} traits influenced</span> : <span>Profile signal</span>}
                  </div>
                  <div className="email-compare">
                    <div>
                      <span className="email-compare-label">Original</span>
                      <p>{original || "Original text unavailable."}</p>
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
                    </div>
                  </div>
                  {feedbackMessage ? (
                    <p
                      className="history-feedback-message"
                      role={feedbackMessage.type === "error" ? "alert" : "status"}
                      style={feedbackMessage.type === "error" ? { color: "#f08b78" } : undefined}
                    >
                      {feedbackMessage.text}
                    </p>
                  ) : null}
                </article>
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
    const learnedExamples = Number(styleData.currentStyle?.stats?.learned_examples || styleData.emailHistory.length || 0);
    const strengthPercent = Math.round(styleData.styleStrength * 100);
    const summary = buildPersonaSummary(displayStyle, selectedSnapshot ? "" : styleData.personaSummary);
    const hasPersona = traits.length > 0 || learnedExamples > 0 || snapshots.length > 0;

    // FRONTEND: The profile combines map, confidence, evolution, summary, and feedback history in one responsive workspace.
    return (
      <div className="style-page">
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
            <section className="style-hero-grid">
              <div className="style-card persona-map-card">
                <div className="style-card-heading">
                  <div>
                    <span className="eyebrow">PERSONA MAP</span>
                    <h2>Your voice, mapped</h2>
                    <p>Stronger lines mean PhraseAI has more confidence in that trait.</p>
                  </div>
                  <span className="live-profile-badge"><span /> Live profile</span>
                </div>
                <div className="persona-map-wrap">
                  <PersonaMap initials={accountInitials} traits={traits} />
                </div>
              </div>

              <div className="style-side-stack">
                <section className="style-card persona-summary-card">
                  <span className="eyebrow">IN PLAIN ENGLISH</span>
                  <h2>This is how you sound</h2>
                  <p>{summary}</p>
                  <div className="trait-chip-row">
                    {traits.slice(0, 5).map((trait) => (
                      <span className="trait-chip" key={trait.label}>{titleCase(trait.label)}</span>
                    ))}
                  </div>
                </section>

                <section className="style-card strength-card">
                  <div className="strength-heading">
                    <div>
                      <span className="eyebrow">STYLE STRENGTH</span>
                      <h2>{strengthPercent}% understood</h2>
                    </div>
                    <strong>{learnedExamples}</strong>
                  </div>
                  <div className="strength-track" role="progressbar" aria-label="Style strength" aria-valuemin="0" aria-valuemax="100" aria-valuenow={strengthPercent}>
                    <span style={{ width: `${strengthPercent}%` }} />
                  </div>
                  <p>Your style profile is {strengthPercent}% complete — submit more emails to sharpen your rewrites.</p>
                </section>
              </div>
            </section>

            <section className="style-card evolution-card">
              <div className="style-card-heading">
                <div>
                  <span className="eyebrow">EVOLUTION</span>
                  <h2>Your profile is growing</h2>
                  <p>Select a moment to see the persona PhraseAI understood then.</p>
                </div>
                <span className="timeline-count">{snapshots.length} snapshots</span>
              </div>
              {snapshots.length ? (
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
                          <small>{completeness ? `${completeness}% complete` : `Version ${index + 1}`}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="timeline-empty">Your first saved persona snapshot will appear here after more learning.</div>
              )}
            </section>

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
      <div className="rounded-2xl border p-6" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
            <p className="text-xs" style={{ color: tokens.muted }}>Email</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>{session?.user?.email || "Unknown"}</p>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
            <p className="text-xs" style={{ color: tokens.muted }}>Member since</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>{accountCreated}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
          <p className="text-xs" style={{ color: tokens.muted }}>Profile details</p>
          <p className="mt-1 text-sm" style={{ color: tokens.text }}>Display name: {metadata.full_name || metadata.name || "Not set"}</p>
          <p className="mt-1 text-sm" style={{ color: tokens.soft }}>User ID: {session?.user?.id || "Unavailable"}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("home")}
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{ borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.surface }}
          >
            Back to Workspace
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{ borderColor: tokens.border, color: tokens.secondaryText, backgroundColor: tokens.secondaryBg }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

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
      <aside
        className="app-sidebar"
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
              <button
                key={item.key}
                type="button"
                className={active ? "sidebar-link active" : "sidebar-link"}
                onClick={() => setActiveSection(item.key)}
                aria-current={active ? "page" : undefined}
                title={item.label}
              >
                <Icon />
                <span className="sidebar-link-copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className={isSettings ? "sidebar-link active" : "sidebar-link"}
            onClick={() => setActiveSection("settings")}
            aria-current={isSettings ? "page" : undefined}
            title="Settings"
          >
            <SettingsIcon />
            <span className="sidebar-link-copy">
              <strong>Settings</strong>
              <small>Theme and preferences</small>
            </span>
          </button>

          <button
            type="button"
            className={isAccount ? "account-button active" : "account-button"}
            onClick={() => setActiveSection("account")}
            title={`${accountName} (account settings)`}
            aria-label="Account"
          >
            <span className="account-avatar">{accountInitials}</span>
            <span className="account-copy">
              <strong>{session?.user?.email?.split("@")[0] || "Account"}</strong>
              <small>Manage account</small>
            </span>
          </button>
        </div>
      </aside>

      <main
        className="app-main"
      >
        <header className="app-header">
          <div className="app-header-row">
            <div>
              <span className="eyebrow">{activeSection === "home" ? "WORKSPACE" : activeSection.replace("-", " ").toUpperCase()}</span>
              <h1>{currentMeta.title}</h1>
              <p>{currentMeta.sub}</p>
            </div>
            <div className="app-header-actions">
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
        </header>

        <div className="app-content">
          {isHome ? renderHome() : null}
          {isHistory ? renderHistory() : null}
          {isSettings ? renderSettings() : null}
          {isStyleProfile ? renderStyleProfile() : null}
          {isAccount ? renderAccount() : null}
        </div>
      </main>
    </div>
  );
}

export default App;
