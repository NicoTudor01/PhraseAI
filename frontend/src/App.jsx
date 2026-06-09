import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const FORCE_LOGIN_ON_VISIT = (import.meta.env.VITE_FORCE_LOGIN_ON_VISIT || "true").toLowerCase() === "true";
const THEME_STORAGE_KEY = "phraseai-theme";
const IS_DEV = import.meta.env.DEV;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const MODES = [
  { key: "more_professional", label: "More Professional" },
  { key: "sound_smarter", label: "Sound Smarter" },
  { key: "fix_grammar", label: "Fix My Grammar" },
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
    pageBackground:
      "radial-gradient(circle at top, rgba(255,255,255,0.95), transparent 28%), linear-gradient(180deg, #f8f6f1 0%, #f0ebe3 48%, #e6dfd6 100%)",
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

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" style={{ vectorEffect: "non-scaling-stroke" }} aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 20c1.5-3.1 4.2-4.7 6.8-4.7 2.6 0 5.3 1.6 6.8 4.7" />
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

function App() {
  const [draft, setDraft] = useState("");
  const [contextText, setContextText] = useState("");
  const [mode, setMode] = useState("more_professional");
  const [rewritten, setRewritten] = useState("");
  const [lastAiOutput, setLastAiOutput] = useState("");
  const [activeSection, setActiveSection] = useState("home");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState("");
  const [learnMessage, setLearnMessage] = useState("");
  const [stressMessage, setStressMessage] = useState("");
  const [stressLoading, setStressLoading] = useState(false);
  const [profile, setProfile] = useState({});
  const [learningEvents, setLearningEvents] = useState([]);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [copyStatus, setCopyStatus] = useState("Copy");
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const accountName = session?.user?.email || "Client";
  const accountInitials = getInitials(accountName);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      if (!supabase) {
        setAuthError("Missing Supabase frontend configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setAuthReady(true);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError) {
        setAuthError(sessionError.message || "Could not read current session.");
      }

      if (FORCE_LOGIN_ON_VISIT && data.session) {
        await supabase.auth.signOut();
        setSession(null);
        setAuthMessage("Please sign in to continue.");
        setAuthReady(true);
        return;
      }

      setSession(data.session || null);
      setAuthReady(true);
    }

    bootstrapAuth();

    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession || null);
        })
      : { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setProfile({});
      setLearningEvents([]);
      return;
    }
    loadProfile();
    loadLearningEvents();
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

  const activeSectionTitle =
    navItems.find((item) => item.key === activeSection)?.label || (activeSection === "settings" ? "Settings" : "Home");

  const isHome = activeSection === "home";
  const isHistory = activeSection === "history";
  const isSettings = activeSection === "settings";
  const isStyleProfile = activeSection === "style-profile";
  const isAccount = activeSection === "account";
  const rewriteReady = draft.trim().length > 0;

  async function apiFetch(path, options = {}) {
    if (!session?.access_token) {
      throw new Error("You must be logged in.");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Request failed.");
    }

    return data;
  }

  async function loadProfile() {
    try {
      const data = await apiFetch("/profile/me");
      setProfile(data.profile || {});
    } catch {
      // Keep UX resilient if profile storage is temporarily unavailable.
      setProfile({});
    }
  }

  async function loadLearningEvents() {
    try {
      const data = await apiFetch("/learning-events/me?limit=25");
      setLearningEvents(data.events || []);
    } catch {
      setLearningEvents([]);
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
      setLearnMessage("");
    } catch (err) {
      setError(err.message || "Unexpected rewrite error.");
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
      const data = await apiFetch("/learn", {
        method: "POST",
        body: JSON.stringify({
          mode,
          draft,
          ai_output: lastAiOutput,
          final_version: rewritten,
        }),
      });

      setProfile(data.profile || {});
      loadLearningEvents();
      setLearnMessage("Saved. Future rewrites will adapt to your style.");
    } catch (err) {
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

      setProfile(data.profile || {});
      setStressMessage(`Stress test completed with ${data.processed_samples || 0} samples.`);
      loadLearningEvents();
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

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthError("Supabase client is not configured.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          throw signUpError;
        }
        setAuthMessage("Account created. Check your email for confirmation if required, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw signInError;
        }
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setDraft("");
    setRewritten("");
    setLastAiOutput("");
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

  if (!session?.access_token) {
    const trustPoints = [
      {
        title: "Adaptive Learning",
        text: "PhraseAI tracks the changes you accept and uses that signal to tune future rewrites toward your natural style.",
      },
      {
        title: "Context-Aware Rewriting",
        text: "Switch between professional, smarter, and grammar-focused modes while preserving intent and clarity.",
      },
      {
        title: "Private by Default",
        text: "Your writing profile is linked to your account and protected by authenticated API routes and row-level policies.",
      },
    ];

    const workflowSteps = [
      {
        step: "01",
        title: "Draft",
        text: "Paste your email draft or compose directly in the workspace.",
      },
      {
        step: "02",
        title: "Rewrite",
        text: "Generate a stronger version based on your chosen style mode.",
      },
      {
        step: "03",
        title: "Finalize",
        text: "Edit the output, lock in the final message, and save learning signals.",
      },
      {
        step: "04",
        title: "Improve",
        text: "Review profile and history pages to monitor how your writing persona evolves.",
      },
    ];

    const contactItems = [
      { label: "Support Email", value: "support@phraseai.app", href: "mailto:support@phraseai.app" },
      { label: "Sales & Partnerships", value: "partners@phraseai.app", href: "mailto:partners@phraseai.app" },
      { label: "Response Time", value: "Under 24 hours (Mon-Fri)", href: null },
      { label: "Live Office Hours", value: "09:00 - 18:00 UTC", href: null },
    ];

    const storyMedia = [
      {
        key: "atelier",
        title: "Crafted Rewriting",
        text: "A polished flow from rough draft to final message.",
        image: "/visuals/story-atelier.svg",
      },
      {
        key: "motion",
        title: "Learning In Motion",
        text: "Accepted edits shape each future rewrite.",
        image: "/visuals/story-motion.svg",
      },
      {
        key: "support",
        title: "Connected Support",
        text: "Onboarding and enterprise help one message away.",
        image: "/visuals/story-contact.svg",
      },
    ];

    return (
      <div
        style={{
          minHeight: "100vh",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          background:
            "radial-gradient(circle at 12% 10%, rgba(134,197,255,0.2), transparent 28%), radial-gradient(circle at 88% 84%, rgba(120,255,188,0.14), transparent 35%), linear-gradient(160deg, #040810 0%, #0d1a2d 45%, #091120 100%)",
          color: "#f5f7fb",
          padding: "24px 18px 40px",
          fontFamily: "Space Grotesk, Avenir Next, Segoe UI, sans-serif",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -80,
            left: -120,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(125,196,255,0.34) 0%, rgba(125,196,255,0.03) 70%)",
            filter: "blur(4px)",
            pointerEvents: "none",
            animation: "landing-float 11s ease-in-out infinite",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -120,
            top: 220,
            width: 340,
            height: 340,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(106,255,184,0.26) 0%, rgba(106,255,184,0.02) 72%)",
            filter: "blur(6px)",
            pointerEvents: "none",
            animation: "landing-float 14s ease-in-out infinite reverse",
          }}
        />

        <div style={{ width: "100%", maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <section
            style={{
              minHeight: "100vh",
              scrollSnapAlign: "start",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 24,
              background: "rgba(8,13,24,0.72)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.34)",
              backdropFilter: "blur(10px)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ padding: "42px 36px 34px" }}>
                <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.16em", color: "rgba(255,255,255,0.68)" }}>PHRASEAI STUDIO</p>
                <h1 style={{ margin: "14px 0 0", fontSize: "clamp(2rem, 4.5vw, 3.1rem)", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
                  Write sharper emails in your own voice.
                </h1>
                <p style={{ margin: "18px 0 0", maxWidth: 560, fontSize: 16, lineHeight: 1.6, color: "rgba(238,242,255,0.82)" }}>
                  PhraseAI transforms rough drafts into polished communication while learning from your final edits. The result is an assistant that gets more aligned with every message you send.
                </p>
                <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    "Smart Rewrite Modes",
                    "Learning Style Profile",
                    "Secure Account-Based Access",
                  ].map((tag) => (
                    <span
                      key={tag}
                      style={{
                        border: "1px solid rgba(255,255,255,0.16)",
                        borderRadius: 999,
                        padding: "6px 12px",
                        fontSize: 12,
                        color: "rgba(239,244,255,0.9)",
                        background: "rgba(255,255,255,0.05)",
                        transition: "transform 180ms ease, background 180ms ease",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ padding: "30px 26px", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <form
                  onSubmit={handleAuthSubmit}
                  style={{
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 18,
                    background: "rgba(13,19,34,0.84)",
                    padding: 22,
                    transition: "all 260ms ease",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>PhraseAI Access</h2>
                  <p style={{ marginTop: 8, fontSize: 13, color: "rgba(238,242,255,0.68)" }}>
                    {authMode === "signin" ? "Sign in to continue your writing workspace." : "Create your secure workspace account."}
                  </p>

                  <label style={{ display: "block", marginTop: 18, fontSize: 11, letterSpacing: "0.08em", color: "rgba(238,242,255,0.66)" }}>EMAIL</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "11px 12px",
                      borderRadius: 11,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#f8fafc",
                      outline: "none",
                      transition: "all 180ms ease",
                    }}
                  />

                  <label style={{ display: "block", marginTop: 12, fontSize: 11, letterSpacing: "0.08em", color: "rgba(238,242,255,0.66)" }}>PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "11px 12px",
                      borderRadius: 11,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#f8fafc",
                      outline: "none",
                      transition: "all 180ms ease",
                    }}
                  />

                  <button
                    type="submit"
                    disabled={authBusy}
                    style={{
                      marginTop: 16,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 11,
                      border: "none",
                      background: "linear-gradient(90deg, #f5f7ff 0%, #d9e8ff 100%)",
                      color: "#071327",
                      fontWeight: 700,
                      cursor: authBusy ? "not-allowed" : "pointer",
                      opacity: authBusy ? 0.7 : 1,
                      transition: "all 180ms ease",
                    }}
                  >
                    {authBusy ? "Working..." : authMode === "signin" ? "Sign In" : "Create Account"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
                      setAuthError("");
                      setAuthMessage("");
                    }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 11,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(244,247,255,0.9)",
                      cursor: "pointer",
                      transition: "all 180ms ease",
                    }}
                  >
                    {authMode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
                  </button>

                  {authError ? <p style={{ marginTop: 12, fontSize: 12, color: "#fda4af" }}>{authError}</p> : null}
                  {authMessage ? <p style={{ marginTop: 12, fontSize: 12, color: "rgba(244,247,255,0.7)" }}>{authMessage}</p> : null}
                </form>
              </div>
            </div>

            <div style={{ padding: "28px 30px 34px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>Why teams choose PhraseAI</h3>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {trustPoints.map((item) => (
                  <article
                    key={item.title}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                      transition: "transform 220ms ease, border-color 220ms ease, background 220ms ease",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.title}</p>
                    <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, color: "rgba(236,241,255,0.78)" }}>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div style={{ padding: "28px 30px 34px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>How the learning flow works</h3>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {workflowSteps.map((item) => (
                  <div
                    key={item.step}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 14,
                      background: "linear-gradient(170deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                      padding: "14px 14px 12px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(198,214,255,0.9)", letterSpacing: "0.08em" }}>{item.step}</p>
                    <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700 }}>{item.title}</p>
                    <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45, color: "rgba(236,241,255,0.78)" }}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "28px 30px 34px" }}>
              <h3 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.02em" }}>Contact us</h3>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(236,241,255,0.74)", lineHeight: 1.5 }}>
                Questions, onboarding help, or enterprise requests? Reach our team directly and we will guide you.
              </p>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
                {contactItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", color: "rgba(194,209,244,0.84)" }}>{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        style={{
                          marginTop: 8,
                          display: "inline-block",
                          fontSize: 14,
                          color: "#d7e8ff",
                          textDecoration: "none",
                          borderBottom: "1px solid rgba(215,232,255,0.45)",
                          paddingBottom: 1,
                        }}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p style={{ margin: "8px 0 0", fontSize: 14, color: "#d7e8ff" }}>{item.value}</p>
                    )}
                  </div>
                ))}
              </div>

              <p style={{ margin: "18px 0 0", fontSize: 12, color: "rgba(236,241,255,0.56)" }}>
                By continuing, you agree to use PhraseAI for lawful business communication and accept standard security monitoring.
              </p>
            </div>
          </section>

          <section
            style={{
              marginTop: 14,
              minHeight: "100vh",
              scrollSnapAlign: "start",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              background: "rgba(8,13,24,0.62)",
              backdropFilter: "blur(8px)",
              padding: "20px 16px",
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.16em", color: "rgba(214,230,255,0.78)" }}>SCROLL EXPERIENCE</p>
            <h3 style={{ margin: "8px 0 0", fontSize: 28, letterSpacing: "-0.03em" }}>A premium visual narrative for your front page</h3>
            <p style={{ margin: "10px 0 0", maxWidth: 760, color: "rgba(230,241,255,0.74)", lineHeight: 1.6, fontSize: 14 }}>
              These are custom generated visuals for PhraseAI, giving your page that cinematic professional flow while staying original.
            </p>

            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              {storyMedia.map((item, index) => (
                <article
                  key={item.key}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 16px 42px rgba(0,0,0,0.28)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                    <div style={{ padding: "18px 18px 16px" }}>
                      <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.1em", color: "rgba(194,212,245,0.88)" }}>
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h4 style={{ margin: "8px 0 0", fontSize: 22, letterSpacing: "-0.02em" }}>{item.title}</h4>
                      <p style={{ margin: "10px 0 0", lineHeight: 1.6, fontSize: 14, color: "rgba(229,238,255,0.78)" }}>{item.text}</p>
                    </div>
                    <div style={{ minHeight: 220, borderLeft: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      <img
                        src={item.image}
                        alt={`${item.title} visual`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scale(1.02)" }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            style={{
              marginTop: 14,
              minHeight: "36vh",
              scrollSnapAlign: "start",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              background: "rgba(8,13,24,0.62)",
              backdropFilter: "blur(8px)",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 12,
              color: "rgba(233,240,255,0.76)",
            }}
          >
            <span>Built for founders, operators, and client-facing teams.</span>
            <span>Need help now? Email support@phraseai.app</span>
          </section>
        </div>
      </div>
    );
  }

  function renderHome() {
    const cardBackground = tokens.surfaceStrong;
    const cardBorder = tokens.border;
    const bodyText = tokens.text;
    const subduedText = tokens.muted;
    const textareaBackground = tokens.fieldBg;
    const textareaBorder = tokens.border;
    const textareaColor = tokens.fieldText;
    const modeActiveBackground = tokens.primaryBg;
    const modeActiveColor = tokens.primaryText;
    const modeInactiveBackground = tokens.inactiveNavBg;
    const modeInactiveColor = tokens.inactiveNavText;
    const actionBackground = tokens.primaryBg;
    const actionColor = tokens.primaryText;
    const secondaryActionBackground = tokens.secondaryBg;
    const secondaryActionColor = tokens.secondaryText;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          width: "100%",
          height: "100%",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            background: cardBackground,
            border: `1px solid ${cardBorder}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2px", color: subduedText, marginBottom: 4 }}>INPUT</p>
          <p style={{ fontSize: 12, lineHeight: 1.45, color: subduedText, marginBottom: 16 }}>Draft your email and choose how to transform it.</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste or write your email draft here..."
            className="themed-textarea"
            style={{
              flex: 1,
              minHeight: 0,
              background: textareaBackground,
              border: `1px solid ${textareaBorder}`,
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: textareaColor,
              resize: "none",
              width: "100%",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                style={
                  mode === m.key
                    ? {
                        padding: "6px 16px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        border: "1px solid transparent",
                        cursor: "pointer",
                        background: modeActiveBackground,
                        color: modeActiveColor,
                        transition: "all 150ms ease",
                      }
                    : {
                        padding: "6px 16px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        border: `1px solid ${cardBorder}`,
                        cursor: "pointer",
                        background: modeInactiveBackground,
                        color: modeInactiveColor,
                        transition: "all 150ms ease",
                      }
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2px", color: subduedText, marginBottom: 6 }}>
              CONTEXT (OPTIONAL)
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.4, color: subduedText, marginBottom: 10 }}>
              Paste the email you are replying to, or add extra instructions.
            </p>
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Original email or extra context..."
              className="themed-textarea"
              style={{
                minHeight: 96,
                background: textareaBackground,
                border: `1px solid ${textareaBorder}`,
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                color: textareaColor,
                resize: "vertical",
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleRewrite}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 12px",
              background: actionBackground,
              color: actionColor,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 12,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : rewriteReady ? 1 : 0.6,
              transition: "all 150ms ease",
            }}
          >
            {loading ? "Rewriting..." : `Rewrite (${modeLabel})`}
          </button>

          {error ? (
            <p style={{ marginTop: 12, fontSize: 12, color: subduedText }}>{error}</p>
          ) : null}
        </div>

        <div
          style={{
            background: cardBackground,
            border: `1px solid ${cardBorder}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            height: "100%",
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2px", color: subduedText, marginBottom: 4 }}>OUTPUT</p>
          <p style={{ fontSize: 12, lineHeight: 1.45, color: subduedText, marginBottom: 16 }}>Edit the rewritten email, then copy your final version.</p>

          <textarea
            value={rewritten}
            onChange={(e) => setRewritten(e.target.value)}
            placeholder="Your rewritten email will appear here..."
            className="themed-textarea"
            style={{
              flex: 1,
              minHeight: 0,
              background: textareaBackground,
              border: `1px solid ${textareaBorder}`,
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: textareaColor,
              resize: "none",
              width: "100%",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={copyResult}
              style={{
                flex: 1,
                padding: 10,
                background: secondaryActionBackground,
                border: `1px solid ${cardBorder}`,
                color: secondaryActionColor,
                fontSize: 13,
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {copyStatus}
            </button>
            <button
              type="button"
              onClick={handleFinalizeVersion}
              disabled={learning}
              style={{
                flex: 1,
                padding: 10,
                background: actionBackground,
                color: actionColor,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 12,
                border: "none",
                cursor: learning ? "not-allowed" : "pointer",
                opacity: learning ? 0.7 : 1,
                transition: "all 150ms ease",
              }}
            >
              {learning ? "Saving..." : "This is my final version"}
            </button>
          </div>

          {learnMessage ? (
            <p style={{ marginTop: 10, fontSize: 12, color: subduedText }}>{learnMessage}</p>
          ) : null}
        </div>
      </div>
    );
  }

  function renderHistory() {
    const recent = learningEvents;

    return (
      <div className="rounded-2xl border p-6" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
        <div className="space-y-3">
          {recent.length === 0 ? (
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: tokens.fieldBg, borderColor: tokens.border }}
            >
              <p className="text-sm font-semibold" style={{ color: tokens.text }}>No learned rewrites yet</p>
              <p className="mt-1 text-xs" style={{ color: tokens.muted }}>Finalize a rewrite to create your first history entry.</p>
            </div>
          ) : (
            recent.map((entry, index) => (
              <div
                key={`${entry.learned_at || "entry"}-${index}`}
                className="rounded-xl border p-4"
                style={{ backgroundColor: tokens.fieldBg, borderColor: tokens.border }}
              >
                <p className="text-sm font-semibold" style={{ color: tokens.text }}>
                  {entry.mode ? entry.mode.replaceAll("_", " ") : "rewrite"}
                </p>
                <p className="mt-1 text-xs" style={{ color: tokens.muted }}>
                  {entry.created_at ? new Date(entry.created_at).toLocaleString() : "Recently"}
                </p>
                <p className="mt-2 text-xs" style={{ color: tokens.soft }}>
                  Source: {entry.source || "manual"} • Final: {entry.final_excerpt || "(no preview)"}
                </p>
              </div>
            ))
          )}
        </div>
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
          Theme changes are applied instantly and remembered when you reopen the app.
        </p>
      </div>
    );
  }

  function renderStyleProfile() {
    const stats = profile.stats || {};
    const preferences = profile.preferences || {};
    const persona = profile.persona || {};
    const guidance = profile.guidance || [];

    return (
      <div className="rounded-2xl border p-6" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
        <div className="rounded-xl border p-5" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
          <p className="text-xs" style={{ color: tokens.muted }}>LEARNED EXAMPLES</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: tokens.text }}>{stats.learned_examples || 0}</p>
          <p className="mt-2 text-xs" style={{ color: tokens.soft }}>
            Last updated: {stats.last_learned_at ? new Date(stats.last_learned_at).toLocaleString() : "No data yet"}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
            <p className="text-xs" style={{ color: tokens.muted }}>Average sentence length</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>
              {preferences.avg_sentence_length || 0} words
            </p>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
            <p className="text-xs" style={{ color: tokens.muted }}>Contraction ratio</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>
              {preferences.contraction_ratio || 0}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
          <p className="text-xs" style={{ color: tokens.muted }}>Learned persona</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border p-3" style={{ borderColor: tokens.border }}>
              <p className="text-xs" style={{ color: tokens.muted }}>Formality</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>{persona.formality || "unknown"}</p>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: tokens.border }}>
              <p className="text-xs" style={{ color: tokens.muted }}>Directness</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>{persona.directness || "unknown"}</p>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: tokens.border }}>
              <p className="text-xs" style={{ color: tokens.muted }}>Energy</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>{persona.energy || "unknown"}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(persona.traits || []).map((trait, index) => (
              <span
                key={`${trait}-${index}`}
                className="rounded-full border px-2 py-1 text-xs"
                style={{ borderColor: tokens.border, color: tokens.soft, backgroundColor: tokens.surface }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
          <p className="text-xs" style={{ color: tokens.muted }}>Generated guidance for future rewrites</p>
          {guidance.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: tokens.soft }}>
              Finalize a rewrite to generate personalized guidance.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm" style={{ color: tokens.text }}>
              {guidance.map((line, index) => (
                <li key={`${line}-${index}`}>• {line}</li>
              ))}
            </ul>
          )}
        </div>

        {IS_DEV ? (
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: tokens.border, backgroundColor: tokens.fieldBg }}>
            <p className="text-xs" style={{ color: tokens.muted }}>Developer stress testing</p>
            <button
              type="button"
              onClick={runStressTest}
              disabled={stressLoading}
              className="mt-2 rounded-lg border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: tokens.border,
                color: tokens.text,
                backgroundColor: tokens.surface,
                cursor: stressLoading ? "not-allowed" : "pointer",
                opacity: stressLoading ? 0.7 : 1,
              }}
            >
              {stressLoading ? "Running stress test..." : "Run Stress Test Learning (30 samples)"}
            </button>
            <p className="mt-2 text-xs" style={{ color: tokens.soft }}>
              Sends synthetic learning events to the backend and updates persona/profile.
            </p>
            {stressMessage ? (
              <p className="mt-2 text-xs" style={{ color: tokens.muted }}>{stressMessage}</p>
            ) : null}
          </div>
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
    history: { title: "Recent Rewrites", sub: "Your saved drafts and rewrites." },
    settings: { title: "App Preferences", sub: "Choose the visual mode for the whole app." },
    "style-profile": { title: "Style Profile", sub: "Define your personal writing voice." },
    account: { title: "Account", sub: "Manage your personal information and session." },
  };
  const currentMeta = sectionMeta[activeSection] || sectionMeta.home;

  const navActiveBg = "rgba(255,255,255,0.15)";
  const navActiveColor = "#ffffff";
  const navHoverBg = "rgba(255,255,255,0.1)";
  const navInactiveColor = "rgba(255,255,255,0.55)";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: tokens.pageBackground,
        color: tokens.text,
        colorScheme: theme,
        fontFamily: "Avenir Next, Segoe UI, Helvetica Neue, Arial, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        "--placeholder-color": tokens.fieldPlaceholder,
      }}
    >
      <aside
        style={{
          width: 88,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          background: theme === "dark" ? "#111111" : "rgba(255,255,255,0.65)",
          borderRight: `1px solid ${tokens.border}`,
          boxSizing: "border-box",
        }}
      >
        <BrandLogoIcon light={theme === "light"} />

        <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 18 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.key;
            return (
              <div key={item.key} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  onMouseEnter={() => setHoveredNav(item.key)}
                  onMouseLeave={() => setHoveredNav((current) => (current === item.key ? null : current))}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? tokens.activeNavBg : "transparent",
                    color: active ? tokens.activeNavText : tokens.inactiveNavText,
                    cursor: "pointer",
                    transition: "transform 150ms ease, background 150ms ease, color 150ms ease",
                    transform: hoveredNav === item.key ? "scale(1.05)" : "scale(1)",
                    boxShadow: active ? "inset 2px 0 0 rgba(255,255,255,0.85)" : "none",
                  }}
                >
                  <Icon />
                </button>
                <div
                  style={{
                    position: "absolute",
                    left: 52,
                    top: "50%",
                    transform: hoveredNav === item.key ? "translate(0, -50%)" : "translate(-4px, -50%)",
                    opacity: hoveredNav === item.key ? 1 : 0,
                    transition: "all 140ms ease",
                    background: theme === "dark" ? "#1a1a1a" : "#ffffff",
                    color: tokens.text,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 40,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", position: "relative" }}>
          <button
            type="button"
            onClick={() => setActiveSection("settings")}
            onMouseEnter={() => setHoveredNav("settings")}
            onMouseLeave={() => setHoveredNav((current) => (current === "settings" ? null : current))}
            aria-current={isSettings ? "page" : undefined}
            title="Settings"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isSettings ? tokens.activeNavBg : "transparent",
              color: isSettings ? tokens.activeNavText : tokens.inactiveNavText,
              cursor: "pointer",
              transition: "transform 150ms ease, background 150ms ease, color 150ms ease",
              transform: hoveredNav === "settings" ? "scale(1.05)" : "scale(1)",
            }}
          >
            <SettingsIcon />
          </button>
          <div
            style={{
              position: "absolute",
              left: 52,
              top: "50%",
              transform: hoveredNav === "settings" ? "translate(0, -50%)" : "translate(-4px, -50%)",
              opacity: hoveredNav === "settings" ? 1 : 0,
              transition: "all 140ms ease",
              background: theme === "dark" ? "#1a1a1a" : "#ffffff",
              color: tokens.text,
              border: `1px solid ${tokens.border}`,
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 12,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 40,
            }}
          >
            Settings
          </div>

          <button
            type="button"
            onClick={() => setActiveSection("account")}
            style={{
              width: 40,
              height: 40,
              marginTop: 10,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: tokens.badgeBg,
              color: tokens.text,
              border: `1px solid ${tokens.badgeBorder}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 150ms ease",
              transform: isAccount ? "scale(1.06)" : "scale(1)",
            }}
            title={`${accountName} (account settings)`}
            aria-label="Account"
          >
            {isAccount ? <AccountIcon /> : accountInitials}
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${tokens.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.04em", margin: 0, color: tokens.text }}>
                {currentMeta.title}
              </h1>
              <p style={{ fontSize: 13, color: tokens.muted, marginTop: 4, marginBottom: 0 }}>
                {currentMeta.sub}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: tokens.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.user?.email || "Signed in"}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  border: `1px solid ${tokens.border}`,
                  background: tokens.secondaryBg,
                  color: tokens.secondaryText,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div style={{ padding: 24, boxSizing: "border-box", flex: 1, minHeight: 0, overflow: "auto" }}>
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
