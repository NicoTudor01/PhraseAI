import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_URL =
  import.meta.env.VITE_API_URL || "https://phraseai-production.up.railway.app";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
// AGENT3: [CHANGE] Preserve Supabase sessions by default; forced sign-out is reserved for explicit test deployments.
const FORCE_LOGIN_ON_VISIT = (import.meta.env.VITE_FORCE_LOGIN_ON_VISIT || "false").toLowerCase() === "true";
const MAX_DRAFT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 8000;
const THEME_STORAGE_KEY = "phraseai-theme";
const IS_DEV = import.meta.env.DEV;
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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

function finalizeSentence(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const normalized = cleaned.length > 1 ? `${cleaned[0].toUpperCase()}${cleaned.slice(1)}` : cleaned.toUpperCase();
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function localRewriteFallback(draftValue, selectedMode, contextValue) {
  let text = finalizeSentence(draftValue);
  if (!text) return "";

  const replacements = [
    [/\bu\b/gi, "you"],
    [/\bur\b/gi, "your"],
    [/\bpls\b/gi, "please"],
    [/\bthx\b/gi, "thanks"],
    [/\bim\b/gi, "I am"],
    [/\bdont\b/gi, "do not"],
    [/\bcant\b/gi, "cannot"],
    [/\bwont\b/gi, "will not"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  if (selectedMode === "fix_grammar") {
    return text;
  }

  if (selectedMode === "more_professional") {
    const polished = text.replace(/\b(hey|hi)\b/gi, "Hello");
    const withContext = contextValue?.trim() ? `${polished} I have incorporated the provided context.` : polished;
    return /thank you\.$/i.test(withContext) ? withContext : `${withContext} Thank you.`;
  }

  const withContext = contextValue?.trim() ? `${text} This reflects the additional context provided.` : text;
  return `${withContext} This version improves clarity and strengthens the message.`;
}

function App() {
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
  const [profile, setProfile] = useState({});
  const [learningEvents, setLearningEvents] = useState([]);
  const [copyStatus, setCopyStatus] = useState("Copy");
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [aiInfo, setAiInfo] = useState(null);
  const loginAttemptsRef = useRef(new Map());
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
      ? supabase.auth.onAuthStateChange((event, nextSession) => {
          // AGENT3: [CHANGE] Recovery links now enter a dedicated set-password state instead of a dead-end login screen.
          if (event === "PASSWORD_RECOVERY") {
            setIsPasswordRecovery(true);
            setAuthMode("recovery");
          }
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
      throw new Error("Authentication is unavailable.");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    let activeSession = sessionData.session || session;
    if (!activeSession?.access_token) {
      throw new Error("You must be logged in.");
    }

    async function sendRequest(accessToken) {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      };
      return fetch(`${API_URL}${path}`, { ...options, headers });
    }

    let response = await sendRequest(activeSession.access_token);
    if (response.status === 401) {
      // AGENT3: [CHANGE] Retry one authenticated request after token refresh before ending the session.
      const { data: refreshedData } = await supabase.auth.refreshSession();
      activeSession = refreshedData.session;
      if (activeSession?.access_token) {
        response = await sendRequest(activeSession.access_token);
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // AGENT4: [HARDENED] UI shows stable messages instead of raw backend/provider exception strings.
      const safeMessage =
        response.status === 401
          ? "Your session expired. Please sign in again."
          : response.status === 422
            ? "This draft or context is too large or invalid."
            : typeof data.detail === "string"
              ? data.detail
              : "Request failed.";
      const requestError = new Error(safeMessage);
      requestError.status = response.status;
      throw requestError;
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
      setLastRewriteSource(data.source || "provider");
      setLearnMessage("");
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
      const message = err?.message || "Unexpected rewrite error.";
      const authLikeFailure = /authorization|auth token|logged in|401/i.test(message);
      const canUseFallback = !err?.status || err.status >= 500;

      // AGENT5: [CHANGE] Local fallback is reserved for provider/network outages, not invalid API requests.
      if (!authLikeFailure && canUseFallback) {
        const fallback = localRewriteFallback(draft, mode, contextText);
        if (fallback) {
          setRewritten(fallback);
          setLastAiOutput(fallback);
          setLastRewriteSource("fallback");
          setError("AI service is temporarily unavailable. Displaying a safe fallback rewrite.");
          return;
        }
      }

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

        {/* AGENT2: [CHANGE] The auth screen prioritizes the form while keeping the product promise visible. */}
        <main className="auth-layout">
          <section className="auth-story">
            <div className="auth-copy">
              <span className="eyebrow">YOUR VOICE, REFINED</span>
              <h1>Write the email you meant to send.</h1>
              <p>
                Turn rough thoughts into clear, confident messages. PhraseAI learns from every final edit so the result sounds more like you over time.
              </p>
              <div className="auth-benefits" aria-label="Product benefits">
                <span><CheckIcon /> Intent preserved</span>
                <span><CheckIcon /> Style learned privately</span>
                <span><CheckIcon /> Ready in seconds</span>
              </div>
            </div>

            <div className="auth-preview" aria-hidden="true">
              <div className="preview-toolbar">
                <span className="preview-dot" />
                <span>Reply draft</span>
                <span className="preview-status"><SparkleIcon /> Refined</span>
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
          </section>

          <section className="auth-form-wrap">
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-form-heading">
                <span className="eyebrow">{isPasswordRecovery ? "ACCOUNT RECOVERY" : authMode === "signin" ? "WELCOME BACK" : "GET STARTED"}</span>
                <h2>{isPasswordRecovery ? "Set a new password" : authMode === "signin" ? "Sign in to PhraseAI" : "Create your workspace"}</h2>
                <p>
                  {isPasswordRecovery
                    ? "Choose a secure password to finish recovering your account."
                    : authMode === "signin"
                      ? "Continue building a writing style that sounds like you."
                      : "Start with a private workspace for your rewrites and style profile."}
                </p>
              </div>

              {!isPasswordRecovery ? (
                <div className="field-group">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                  />
                </div>
              ) : null}

              <div className="field-group">
                <div className="field-label-row">
                  <label htmlFor="auth-password">{isPasswordRecovery ? "New password" : "Password"}</label>
                  {authMode === "signin" && !isPasswordRecovery ? (
                    <button type="button" className="text-button" onClick={handleForgotPassword} disabled={resetBusy}>
                      {resetBusy ? "Sending..." : "Forgot password?"}
                    </button>
                  ) : null}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  placeholder="At least 8 characters"
                />
              </div>

              <button type="submit" className="primary-button auth-submit" disabled={authBusy}>
                <span>{authBusy ? "Working..." : isPasswordRecovery ? "Update password" : authMode === "signin" ? "Sign in" : "Create account"}</span>
                {!authBusy ? <ArrowIcon /> : <span className="button-spinner" />}
              </button>

              {!isPasswordRecovery ? (
                <p className="auth-switch">
                  {authMode === "signin" ? "New to PhraseAI?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
                      setAuthError("");
                      setAuthMessage("");
                    }}
                  >
                    {authMode === "signin" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              ) : null}

              <div className="auth-message-slot" aria-live="polite">
                {authError ? <p className="status-message error">{authError}</p> : null}
                {authMessage ? <p className="status-message success">{authMessage}</p> : null}
              </div>
            </form>
            <p className="auth-footnote">
              By continuing, you agree to keep account access private. Need help?{" "}
              <a href="mailto:support@phraseai.app">Contact support</a>.
            </p>
          </section>
        </main>
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
