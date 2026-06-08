import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USER_ID = "dev-user-1";
const THEME_STORAGE_KEY = "phraseai-theme";

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
  const [activeSection, setActiveSection] = useState("home");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredNav, setHoveredNav] = useState(null);
  const [copyStatus, setCopyStatus] = useState("Copy");
  const accountName = "Client";
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

  const tokens = THEMES[theme];

  const modeLabel = useMemo(() => {
    const found = MODES.find((m) => m.key === mode);
    return found ? found.label : mode;
  }, [mode]);

  const navItems = [
    { key: "home", label: "Home", description: "Rewrite and refine", icon: HomeIcon },
    { key: "history", label: "History", description: "Recent rewritten drafts", icon: HistoryIcon },
    { key: "style-profile", label: "Style Profile", description: "Working to be done", icon: ProfileIcon },
  ];

  const activeSectionTitle =
    navItems.find((item) => item.key === activeSection)?.label || (activeSection === "settings" ? "Settings" : "Home");

  const isHome = activeSection === "home";
  const isHistory = activeSection === "history";
  const isSettings = activeSection === "settings";
  const isStyleProfile = activeSection === "style-profile";
  const rewriteReady = draft.trim().length > 0;

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
        user_id: USER_ID,
        context: contextText.trim() || null,
      };

      const response = await fetch(`${API_URL}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Rewrite failed.");
      }

      setRewritten(data.rewritten || "");
    } catch (err) {
      setError(err.message || "Unexpected rewrite error.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!rewritten) return;
    await navigator.clipboard.writeText(rewritten);
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus("Copy"), 1200);
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
              onClick={() => console.log("Final user version:", rewritten)}
              style={{
                flex: 1,
                padding: 10,
                background: actionBackground,
                color: actionColor,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              This is my final version
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderHistory() {
    return (
      <div className="rounded-2xl border p-6" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-xl border p-4"
              style={{ backgroundColor: tokens.fieldBg, borderColor: tokens.border }}
            >
              <p className="text-sm font-semibold" style={{ color: tokens.text }}>Rewrite #{item}</p>
              <p className="mt-1 text-xs" style={{ color: tokens.muted }}>Working to be done.</p>
            </div>
          ))}
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
    return (
      <div className="rounded-2xl border p-6" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
        <div className="rounded-xl border border-dashed p-8 text-center text-sm" style={{ borderColor: tokens.border, color: tokens.muted }}>
          No profile builder yet. We will define this together.
        </div>
      </div>
    );
  }

  const sectionMeta = {
    home: { title: "Rewrite Emails In Your Voice", sub: "Pick a mode, generate a stronger draft, and refine it inline." },
    history: { title: "Recent Rewrites", sub: "Your saved drafts and rewrites." },
    settings: { title: "App Preferences", sub: "Choose the visual mode for the whole app." },
    "style-profile": { title: "Style Profile", sub: "Define your personal writing voice." },
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
        fontFamily: "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif",
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

          <div
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
              cursor: "default",
            }}
            title={accountName}
          >
            {accountInitials}
          </div>
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
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.04em", margin: 0, color: tokens.text }}>
            {currentMeta.title}
          </h1>
          <p style={{ fontSize: 13, color: tokens.muted, marginTop: 4, marginBottom: 0 }}>
            {currentMeta.sub}
          </p>
        </header>

        <div style={{ padding: 24, boxSizing: "border-box", flex: 1, minHeight: 0, overflow: "auto" }}>
          {isHome ? renderHome() : null}
          {isHistory ? renderHistory() : null}
          {isSettings ? renderSettings() : null}
          {isStyleProfile ? renderStyleProfile() : null}
        </div>
      </main>
    </div>
  );
}

export default App;
