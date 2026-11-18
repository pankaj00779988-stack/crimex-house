"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { CrewMember } from "@/lib/crew/directory";

interface DashboardState {
  authenticated: boolean;
  setupAvailable?: boolean;
  members?: CrewMember[];
  nextCursor?: string | null;
  bot?: {
    configured: boolean;
    enabled: boolean;
    apiSetup?: "unified" | "instagram";
    configurationId?: string;
    verifyToken?: string;
    accountId?: string;
    webhookVerified?: boolean;
  };
}
async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error ?? "The owner service is unavailable. Please retry.",
    );
  return data;
}
export function OwnerDashboard() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "setup" | "recover">("login");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [apiSetup, setApiSetup] = useState<"unified" | "instagram">("unified");
  const [configurationId, setConfigurationId] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recovery, setRecovery] = useState("");
  const [savedRecovery, setSavedRecovery] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [cursors, setCursors] = useState<string[]>([""]);
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const [code, setCode] = useState("");
  const [handleChecked, setHandleChecked] = useState(false);
  const [followerChecked, setFollowerChecked] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const load = useCallback(
    async (query = "", filter = "pending", cursor = "") => {
      const params = new URLSearchParams({
        search: query,
        status: filter,
        cursor,
      });
      const data = await api<DashboardState>(`/api/owner?${params}`);
      setState(data);
      return data;
    },
    [],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const setup = params.get("setup");
      if (setup) {
        setToken(setup);
        setMode("setup");
        window.history.replaceState(null, "", window.location.pathname);
      }
      void load().catch((e) => setError(e.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const el = dialog.current;
    if (selected && el && !el.open) el.showModal();
  }, [selected]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function signIn() {
    await run(async () => {
      const result =
        mode === "setup"
          ? await api<{ recoveryCode?: string }>("/api/owner", {
              mode: "setup",
              token,
              password,
            })
          : await api<{ recoveryCode?: string }>("/api/crew/auth", {
              mode: mode === "recover" ? "recover" : "login",
              handle: "@crimex.house",
              password,
              ...(mode === "recover" ? { recoveryCode: recoveryInput } : {}),
            });
      setPassword("");
      setRecoveryInput("");
      setToken("");
      if (result.recoveryCode) {
        setRecovery(result.recoveryCode);
        setSavedRecovery(false);
      }
      const data = await load();
      if (!data.authenticated)
        throw new Error(
          "This website account does not have owner access. Use your private owner setup link.",
        );
      setMode("login");
    });
  }
  function closeReview() {
    dialog.current?.close();
    setSelected(null);
  }
  async function review(action: "approve" | "revoke") {
    if (!selected) return;
    await run(async () => {
      const result = await api<{ verified: boolean }>("/api/owner", {
        action,
        handle: selected.handle,
        createdAt: selected.createdAt,
        code,
        handleChecked,
        followerChecked,
      });
      const handle = selected.handle;
      closeReview();
      await load(search, status, cursors.at(-1));
      setMessage(
        `${handle}: ${result.verified ? "crew approval saved" : "approval revoked"}. The wallet balance is unchanged.`,
      );
    });
  }
  return (
    <>
      <header className="owner-header">
        <span className="eyebrow pink">
          <LockKeyhole size={14} /> PRIVATE OWNER ACCESS
        </span>
        <h1>
          Crew <span>verification.</span>
        </h1>
        <p>
          Confirm the person behind the handle. Approvals take effect without a
          website release.
        </p>
      </header>
      {error && (
        <p className="owner-alert owner-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="owner-alert" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      {!state ? (
        <p role="status">Loading owner access…</p>
      ) : !state.authenticated ? (
        <section className="owner-auth">
          <ShieldCheck size={30} className="pink" />
          <h2>
            {mode === "setup"
              ? "Set up your owner access"
              : mode === "recover"
                ? "Recover owner access"
                : "Owner sign in"}
          </h2>
          <p>
            For @crimex.house. Use a separate CRIMEX HOUSE website password.
          </p>
          {mode === "setup" && (
            <p>
              If you already have a website account for this handle, enter its
              existing password. Otherwise, choose a password with at least 12
              characters.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void signIn();
            }}
          >
            <label>
              OWNER WEBSITE PASSWORD
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                required
              />
            </label>
            {mode === "recover" && (
              <label>
                SAVED RECOVERY CODE
                <input
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  autoComplete="off"
                  required
                />
              </label>
            )}
            <button
              className="button button-primary"
              disabled={busy || (mode === "setup" && !token)}
            >
              {busy
                ? "PLEASE WAIT…"
                : mode === "setup"
                  ? "CREATE OWNER ACCESS"
                  : mode === "recover"
                    ? "RECOVER OWNER ACCESS"
                    : "SIGN IN"}
            </button>
          </form>
          {mode === "login" ? (
            <button
              className="text-link"
              onClick={() => {
                setMode("recover");
                setError("");
              }}
            >
              USE A RECOVERY CODE
            </button>
          ) : (
            <button
              className="text-link"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              BACK TO SIGN IN
            </button>
          )}
          {mode === "login" && state.setupAvailable && (
            <p className="owner-note">
              First visit? Open the private setup link provided for this
              project.
            </p>
          )}
        </section>
      ) : (
        <>
          {recovery && (
            <section
              className="owner-recovery"
              role="region"
              aria-label="Save owner recovery code"
            >
              <h2>Save your recovery code.</h2>
              <p>
                Keep this privately. It restores your website password and owner
                access.
              </p>
              <label>
                OWNER RECOVERY CODE
                <input
                  readOnly
                  value={recovery}
                  onFocus={(e) => e.target.select()}
                  autoComplete="off"
                />
              </label>
              <label className="owner-check">
                <input
                  type="checkbox"
                  checked={savedRecovery}
                  onChange={(e) => setSavedRecovery(e.target.checked)}
                />
                I saved this recovery code privately.
              </label>
              <button
                className="button button-primary"
                disabled={!savedRecovery}
                onClick={() => setRecovery("")}
              >
                CONTINUE TO DASHBOARD
              </button>
            </section>
          )}
          {!recovery && (
            <>
              <div className="owner-toolbar">
                <p>
                  <ShieldCheck size={16} /> Signed in as owner
                </p>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("/api/crew/auth", { mode: "logout" });
                      setState({ authenticated: false });
                      setMode("login");
                      setPassword("");
                    })
                  }
                >
                  SIGN OUT
                </button>
              </div>
              <section className="owner-guide">
                <h2>Check the DM, then approve.</h2>
                <p>
                  Confirm that the message came from the same Instagram handle
                  and that they follow @crimex.house. Open their card, paste the
                  CREW code from their DM, and approve. A code mismatch keeps
                  them pending.
                </p>
              </section>
              <form
                className="owner-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCursors([""]);
                  void run(async () => {
                    await load(search, status);
                  });
                }}
              >
                <label>
                  FIND A HANDLE
                  <div className="owner-search">
                    <Search size={16} />
                    <input
                      ref={searchRef}
                      placeholder="@username"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      maxLength={31}
                      autoComplete="off"
                    />
                  </div>
                </label>
                <label>
                  STATUS
                  <select
                    aria-label="STATUS"
                    value={status}
                    onChange={(e) => {
                      const filter = e.target.value;
                      setStatus(filter);
                      setCursors([""]);
                      void run(async () => {
                        await load(search, filter);
                      });
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="revoked">Revoked</option>
                    <option value="all">All members</option>
                  </select>
                </label>
                <button className="button" disabled={busy} type="submit">
                  SEARCH
                </button>
                <button
                  className="text-link"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await load(search, status, cursors.at(-1));
                    })
                  }
                >
                  <RefreshCw size={14} /> REFRESH
                </button>
              </form>
              <section
                className="owner-members"
                aria-label="Crew members"
                aria-busy={busy}
              >
                {state.members?.length ? (
                  state.members.map((member) => (
                    <article className="owner-member" key={member.handle}>
                      <div>
                        <span className={`owner-badge owner-${member.status}`}>
                          {member.status === "approved"
                            ? "APPROVED"
                            : member.status.toUpperCase()}
                        </span>
                        <h2>{member.handle}</h2>
                        <p>
                          {member.balance} credits · {member.weeklyPoints}{" "}
                          earned this week
                        </p>
                        <p className="owner-note">
                          Ranking{" "}
                          {member.publicRanking ? "opted in" : "private"}
                          {member.reviewedAt
                            ? ` · ${member.method === "instagram" ? "DM bot" : "Owner"} review ${new Date(member.reviewedAt).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => {
                          setCode("");
                          setHandleChecked(false);
                          setFollowerChecked(false);
                          setError("");
                          setSelected(member);
                        }}
                      >
                        {member.status === "approved" ? "REVIEW" : "VERIFY"}
                        <ChevronRight size={15} />
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="owner-empty">
                    <ShieldCheck size={30} />
                    <h2>
                      No {status === "all" ? "matching" : status} crew accounts.
                    </h2>
                    <p>
                      {search
                        ? "Try another handle or clear your search."
                        : "New website members appear here automatically. Refresh after a member signs up."}
                    </p>
                  </div>
                )}
              </section>
              <div className="owner-pagination">
                {cursors.length > 1 && (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const next = cursors.slice(0, -1);
                        setCursors(next);
                        await load(search, status, next.at(-1));
                      })
                    }
                  >
                    PREVIOUS PAGE
                  </button>
                )}
                {state.nextCursor && (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const next = [...cursors, state.nextCursor!];
                        setCursors(next);
                        await load(search, status, next.at(-1));
                      })
                    }
                  >
                    NEXT PAGE <ChevronRight size={14} />
                  </button>
                )}
              </div>
              <section className="owner-bot">
                <span className="eyebrow pink">INSTAGRAM DM BOT</span>
                <h2>
                  {state.bot?.configured
                    ? state.bot.enabled
                      ? "Automatic checks enabled"
                      : "Ready to connect"
                    : "Meta connection needed"}
                </h2>
                <p>
                  {state.bot?.configured
                    ? "The bot checks the DM sender, their CREW code, and their follow before approval. Owner revocations require manual review."
                    : "Your Creator account supports the integration. Meta app credentials and messaging permission are needed before automatic verification can run."}
                </p>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => {
                    if (!connecting) {
                      setApiSetup(state.bot?.apiSetup ?? "unified");
                      setConfigurationId(state.bot?.configurationId ?? "");
                    }
                    setConnecting(!connecting);
                  }}
                >
                  {connecting
                    ? "CLOSE CONNECTION FORM"
                    : state.bot?.configured
                      ? "UPDATE META CONNECTION"
                      : "CONNECT YOUR META APP"}
                </button>
                {connecting && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        await api("/api/owner", {
                          mode: "connect-instagram",
                          apiSetup,
                          configurationId,
                          accountId: instagramId,
                          appSecret,
                          accessToken,
                        });
                        setAppSecret("");
                        setAccessToken("");
                        setConnecting(false);
                        await load(search, status, cursors.at(-1));
                        setMessage(
                          "Meta credentials saved privately. Verify the callback in your Meta app, then enable automatic checks.",
                        );
                      });
                    }}
                  >
                    <p>
                      Choose the login setup shown in your Meta app. New apps
                      use Unified Login with a business portfolio and a
                      System-user access token (SUAT). Authorize @crimex.house
                      for basic profile and messaging access, then enter the
                      credentials below. App secrets and access tokens are
                      encrypted on the server and never shown again.
                    </p>
                    <label>
                      META APP LOGIN SETUP
                      <select
                        aria-label="META APP LOGIN SETUP"
                        value={apiSetup}
                        onChange={(e) =>
                          setApiSetup(e.target.value as "unified" | "instagram")
                        }
                      >
                        <option value="unified">
                          Unified Login (new Meta apps)
                        </option>
                        <option value="instagram">
                          Instagram Login (older Meta apps)
                        </option>
                      </select>
                    </label>
                    {apiSetup === "unified" && (
                      <label>
                        META CONFIGURATION ID (OPTIONAL)
                        <input
                          value={configurationId}
                          onChange={(e) => setConfigurationId(e.target.value)}
                          autoComplete="off"
                          inputMode="numeric"
                        />
                      </label>
                    )}
                    <label>
                      INSTAGRAM ACCOUNT ID (OPTIONAL)
                      <input
                        value={instagramId}
                        onChange={(e) => setInstagramId(e.target.value)}
                        inputMode="numeric"
                        placeholder="Leave blank to detect from your token"
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      APP SECRET FOR INSTAGRAM WEBHOOK SIGNATURES
                      <input
                        type="password"
                        value={appSecret}
                        onChange={(e) => setAppSecret(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <label>
                      {apiSetup === "unified"
                        ? "SYSTEM-USER ACCESS TOKEN (SUAT)"
                        : "INSTAGRAM USER ACCESS TOKEN"}
                      <input
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <button className="button button-primary" disabled={busy}>
                      {busy
                        ? "CHECKING CONNECTION…"
                        : "CHECK AND SAVE CONNECTION"}
                    </button>
                  </form>
                )}
                {state.bot?.configured && (
                  <div className="owner-callback">
                    <p>
                      In your Meta app, add this callback URL and verification
                      token, subscribe to the Instagram{" "}
                      <strong>messages</strong> field. The Enable button
                      registers notifications for your professional account.
                      Complete any permissions or access review Meta requires.
                    </p>
                    <label>
                      CALLBACK URL
                      <input
                        readOnly
                        value="https://crimexhouse.vercel.app/api/instagram/webhook"
                        onFocus={(e) => e.target.select()}
                      />
                    </label>
                    <label>
                      WEBHOOK VERIFICATION TOKEN
                      <input
                        readOnly
                        value={state.bot.verifyToken ?? ""}
                        onFocus={(e) => e.target.select()}
                      />
                    </label>
                    <p className="owner-note">
                      {state.bot.webhookVerified
                        ? "Callback verified by Meta."
                        : "Waiting for Meta callback verification."}{" "}
                      Test with a fresh CREW-code DM after enabling. Renew the
                      Instagram access token when Meta requires it.
                    </p>
                  </div>
                )}
                {state.bot?.configured && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api("/api/owner", {
                          mode: "bot",
                          enabled: !state.bot?.enabled,
                        });
                        await load(search, status, cursors.at(-1));
                      })
                    }
                  >
                    {state.bot.enabled
                      ? "PAUSE AUTOMATIC CHECKS"
                      : "ENABLE AUTOMATIC CHECKS"}
                  </button>
                )}
                <p className="owner-note">
                  Follow status is checked when the member requests
                  verification. Manual review and revocation remain available.
                </p>
              </section>
            </>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        className="owner-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setSelected(null);
        }}
        onClose={() => setSelected(null)}
        aria-labelledby="owner-review-title"
      >
        {selected && (
          <>
            <button
              className="owner-close"
              aria-label="Close crew review"
              disabled={busy}
              onClick={closeReview}
            >
              <X size={20} />
            </button>
            <span className="eyebrow pink">PRIVATE CREW REVIEW</span>
            <h2 id="owner-review-title">{selected.handle}</h2>
            <a
              className="text-link"
              href={`https://www.instagram.com/${selected.handle.slice(1)}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              OPEN INSTAGRAM PROFILE ↗
            </a>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void review("approve");
              }}
            >
              <label>
                CREW CODE FROM THEIR INSTAGRAM DM
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CREW-XXXXXXXXXX"
                  autoComplete="off"
                  maxLength={40}
                  required
                />
              </label>
              <label className="owner-check">
                <input
                  type="checkbox"
                  checked={handleChecked}
                  onChange={(e) => setHandleChecked(e.target.checked)}
                  required
                />
                The DM was sent by {selected.handle}.
              </label>
              <label className="owner-check">
                <input
                  type="checkbox"
                  checked={followerChecked}
                  onChange={(e) => setFollowerChecked(e.target.checked)}
                  required
                />
                I checked that they follow @crimex.house.
              </label>
              {error && (
                <p className="owner-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-primary"
                disabled={
                  busy || !handleChecked || !followerChecked || !code.trim()
                }
              >
                {busy ? "SAVING…" : "APPROVE CREW MEMBER"}
              </button>
            </form>
            {selected.status === "approved" && (
              <button
                className="text-link owner-revoke"
                disabled={busy}
                onClick={() => void review("revoke")}
              >
                REVOKE APPROVAL
              </button>
            )}
            <p className="owner-note">
              Approval and revocation change eligibility. Their earned credits
              and wallet balance stay intact.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
