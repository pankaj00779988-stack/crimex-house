"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Coins,
  Download,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import type { publicAccount } from "@/lib/crew/model";
type Wallet = ReturnType<typeof publicAccount>;
interface CrewState {
  configured: boolean;
  account: Wallet | null;
  day: string;
  week: string;
  resetAt: string;
  reward: { id: string; title: string; credits: number; description: string };
}
interface Puzzle {
  ticket: string;
  kind: "cipher" | "briefing" | "memory";
  prompt: string;
  choices?: string[];
  deck?: string[];
  expiresAt: string;
}
interface Standings {
  week: string;
  nextWeek: string;
  entries: { rank: number; handle: string; points: number }[];
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
      data.error || "The crew service is unavailable. Please try again.",
    );
  return data as T;
}
interface Catalog {
  missions: {
    id: string;
    title: string;
    label: string;
    description: string;
    credits: number;
  }[];
  reward: CrewState["reward"];
  dailyLimit: number;
}
export function CrewMissions({ catalog }: { catalog: Catalog }) {
  const [state, setState] = useState<CrewState | null>(null),
    [standings, setStandings] = useState<Standings | null>(null);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("register"),
    [handle, setHandle] = useState(""),
    [password, setPassword] = useState(""),
    [ranking, setRanking] = useState(false),
    [recoveryInput, setRecoveryInput] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [recovery, setRecovery] = useState(""),
    [savedRecovery, setSavedRecovery] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null),
    [activeTitle, setActiveTitle] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const lastReset = useRef("");
  const refresh = useCallback(async () => {
    try {
      const data = await api<CrewState>("/api/crew");
      setState(data);
      setError("");
      if (data.configured) {
        try {
          setStandings(await api<Standings>("/api/crew/leaderboard"));
        } catch {
          setStandings(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your account.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (
        state &&
        now >= Date.parse(state.resetAt) &&
        lastReset.current !== state.day
      ) {
        lastReset.current = state.day;
        void refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state, refresh]);
  const account = state?.account;
  const seconds = state
    ? Math.max(0, Math.ceil((Date.parse(state.resetAt) - clock) / 1000))
    : 0;
  const countdown = state
    ? [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
        .map((n) => String(n).padStart(2, "0"))
        .join(" : ")
    : "-- : -- : --";
  const missions =
    account?.missions ??
    catalog.missions.map((m) => ({ ...m, completed: false, attemptsLeft: 5 }));
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await api<{ account: Wallet; recoveryCode?: string }>(
        "/api/crew/auth",
        {
          mode,
          handle,
          password,
          publicRanking: ranking,
          recoveryCode: recoveryInput,
        },
      );
      setPassword("");
      setRecoveryInput("");
      setState((s) => (s ? { ...s, account: result.account } : s));
      if (result.recoveryCode) {
        setRecovery(result.recoveryCode);
        setSavedRecovery(false);
      }
      setMessage(
        mode === "register"
          ? "Your crew account is ready. Start a daily mission."
          : "Signed in. Your credits are ready.",
      );
    });
  }
  async function startMission(id: string, title: string) {
    if (!account) {
      document.getElementById("crew-handle")?.focus();
      document
        .getElementById("crew-account")
        ?.scrollIntoView({ block: "center" });
      return;
    }
    await run(async () => {
      const next = await api<Puzzle>(`/api/crew/challenge?mission=${id}`);
      setActiveTitle(title);
      setPuzzle(next);
    });
  }
  return (
    <>
      <div className="missions-kicker">
        <span className="eyebrow pink">
          <Fingerprint size={14} /> THE DAILY BRIEFING
        </span>
        <a className="text-link" href="#weekly-crew">
          THIS WEEK’S TOP 10 <ArrowRight size={15} />
        </a>
      </div>
      <header className="missions-header">
        <h1>
          MAKE YOUR NEXT
          <br />
          <span>MOVE COUNT.</span>
        </h1>
        <p>Three daily missions. Real progress. Your own place in the crew.</p>
        <div className="mission-reset">
          <span>NEW MISSIONS AT MIDNIGHT ET</span>
          <strong>{countdown}</strong>
        </div>
      </header>
      {error && (
        <div className="crew-notice crew-error" role="alert">
          {error}
          <button onClick={() => void refresh()} className="text-link">
            RETRY <RefreshCw size={13} />
          </button>
        </div>
      )}
      {message && (
        <p className="crew-notice" role="status">
          {message}
        </p>
      )}
      {state && !state.configured && (
        <p className="crew-notice" role="status">
          Crew accounts are temporarily unavailable. Free story games are still
          open.
        </p>
      )}
      {!account && (
        <section className="mission-reward-preview" aria-labelledby="reward-preview-title">
          <div className="mission-reward-preview-art" aria-hidden="true">
            <span>CRIMEX HOUSE</span>
            <strong>ZERO<br /><i>ALIBIS.</i></strong>
            <span>YOUR CREW ID</span>
          </div>
          <div>
            <span className="eyebrow pink">YOUR FIRST UNLOCK</span>
            <h2 id="reward-preview-title">Your personal Crew ID.</h2>
            <p>
              Earn {catalog.reward.credits} credits for a personalized phone wallpaper.
              Follow and verify your crew account before redeeming.
            </p>
            <a className="text-link" href="#crew-rewards">
              VIEW THE REWARD <ArrowRight size={14} />
            </a>
          </div>
        </section>
      )}
      <div className={`missions-layout${account ? " is-signed-in" : ""}`}>
        <div className="daily-missions" id="daily-missions">
          <div className="mission-section-title">
            <div>
              <span className="eyebrow pink">
                EARN UP TO {catalog.dailyLimit} CREDITS A DAY
              </span>
              <h2>Today’s assignments.</h2>
            </div>
            <span className="eyebrow">
              {account
                ? `${missions.filter((m) => m.completed).length} / 3 COMPLETE`
                : "FREE TO JOIN"}
            </span>
          </div>
          {missions.map((m, i) => (
            <article
              className={`daily-mission ${m.completed ? "mission-complete" : ""}`}
              key={m.id}
            >
              <div className="daily-mission-top">
                <span className="eyebrow">
                  0{i + 1} / {m.label}
                </span>
                <span className="credit-pill">
                  <Coins size={14} /> +{m.credits}
                </span>
              </div>
              <h3>{m.title}</h3>
              <p>{m.description}</p>
              <div className="daily-mission-foot">
                <span>
                  {m.completed
                    ? "CREDITED TO YOUR WALLET"
                    : `${m.attemptsLeft} ATTEMPTS TODAY`}
                </span>
                <button
                  className={`button ${m.completed ? "button-outline" : "primary"}`}
                  disabled={
                    busy ||
                    m.completed ||
                    m.attemptsLeft === 0 ||
                    !state?.configured
                  }
                  onClick={() => void startMission(m.id, m.title)}
                >
                  {m.completed ? (
                    <>
                      <Check size={15} /> COMPLETE
                    </>
                  ) : m.attemptsLeft === 0 ? (
                    "RESET TOMORROW"
                  ) : account ? (
                    <>
                      START MISSION <ArrowRight size={15} />
                    </>
                  ) : (
                    <>
                      JOIN TO EARN <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
          <p className="mission-fineprint">
            One reward per mission per day. Five attempts per mission. Credits
            are earned from completed website challenges. Instagram likes,
            follows, comments and share-button clicks do not award credits.
          </p>
        </div>
        <aside className="crew-sidebar" id="crew-account">
          <section className="crew-wallet">
            <span className="eyebrow">
              <Coins size={14} />{" "}
              {account ? "YOUR CREW WALLET" : "STARTING BALANCE"}
            </span>
            <div className="wallet-number">
              {account?.balance.toLocaleString("en-US") ?? "0"}
              <span>CREW CREDITS</span>
            </div>
            <p>
              Free loyalty credits. No cash value, transfers, or cryptocurrency.
            </p>
            {account && (
              <div className="wallet-stats">
                <span>
                  <strong>{account.weeklyPoints}</strong>EARNED THIS WEEK
                </span>
                <span>
                  <strong>{account.earned}</strong>EARNED ALL TIME
                </span>
              </div>
            )}
          </section>
          {account ? (
            <section className="crew-account-panel">
              <div className="crew-account-line">
                <strong>{account.handle}</strong>
                <span
                  className={`crew-status ${account.verified ? "crew-verified" : ""}`}
                >
                  {account.verified ? "CREW CONFIRMED" : "VERIFICATION PENDING"}
                </span>
              </div>
              {!account.verified && (
                <>
                  <h3>Make your membership official.</h3>
                  <p>
                    Follow{" "}
                    <a
                      href="https://instagram.com/crimex.house"
                      target="_blank"
                      rel="noreferrer"
                    >
                      @crimex.house
                    </a>
                    , then DM this code from the same Instagram account:
                  </p>
                  <input
                    aria-label="Instagram verification code"
                    className="crew-code"
                    value={account.verificationCode}
                    readOnly
                    onFocus={(e) => e.target.select()}
                  />
                  <p className="mission-fineprint">
                    The creator checks your account and follow manually. You can
                    earn now; verified followers can redeem rewards and enter
                    the weekly Top 10.
                  </p>
                </>
              )}
              {account.verified && (
                <p>
                  <ShieldCheck size={16} /> Your crew account is confirmed.
                  Rewards are open.
                </p>
              )}
              <p className="mission-fineprint">
                {account.publicRanking
                  ? "You opted into the public weekly leaderboard."
                  : "Your handle is private. You did not opt into the public leaderboard."}
              </p>
              <details className="crew-settings">
                <summary>ACCOUNT SETTINGS</summary>
                <label className="crew-check">
                  <input
                    type="checkbox"
                    checked={account.publicRanking}
                    disabled={busy}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      void run(async () => {
                        const result = await api<{ account: Wallet }>(
                          "/api/crew/auth",
                          { mode: "preferences", publicRanking: enabled },
                        );
                        setState((s) =>
                          s ? { ...s, account: result.account } : s,
                        );
                        setMessage(
                          "Leaderboard preference saved. Public changes can take a minute to appear.",
                        );
                      });
                    }}
                  />
                  <span>
                    Show my handle and weekly points publicly once confirmed.
                  </span>
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api("/api/crew/auth", {
                        mode: "delete",
                        password: deletePassword,
                      });
                      setDeletePassword("");
                      setRecovery("");
                      setState((s) => (s ? { ...s, account: null } : s));
                      setMessage(
                        "Your crew account, wallet and credit history have been deleted.",
                      );
                    });
                  }}
                >
                  <p>
                    Deleting your account permanently removes your wallet and
                    rewards. Enter your website password to confirm.
                  </p>
                  <label htmlFor="crew-delete-password">
                    CONFIRM WEBSITE PASSWORD
                  </label>
                  <input
                    id="crew-delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                  />
                  <button
                    className="button button-outline"
                    disabled={busy || !deletePassword}
                  >
                    DELETE MY CREW ACCOUNT
                  </button>
                </form>
              </details>
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api("/api/crew/auth", { mode: "logout" });
                    setRecovery("");
                    setState((s) => (s ? { ...s, account: null } : s));
                    setMessage("Signed out. Your wallet is saved.");
                  })
                }
              >
                SIGN OUT <ArrowRight size={14} />
              </button>
            </section>
          ) : (
            <section className="crew-account-panel">
              <span className="eyebrow pink">YOUR HANDLE. YOUR CREW FILE.</span>
              <h2>
                {mode === "register"
                  ? "Join the crew."
                  : mode === "recover"
                    ? "Recover your account."
                    : "Welcome back."}
              </h2>
              <p>
                Create a website account to save credits across visits and
                devices.
              </p>
              <div className="crew-auth-tabs">
                <button
                  aria-pressed={mode === "register"}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  JOIN
                </button>
                <button
                  aria-pressed={mode === "login"}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  SIGN IN
                </button>
              </div>
              <form onSubmit={submitAuth}>
                <label htmlFor="crew-handle">INSTAGRAM HANDLE</label>
                <input
                  id="crew-handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  autoComplete="username"
                  placeholder="@your.handle"
                  maxLength={31}
                  required
                />
                <label htmlFor="crew-password">
                  {mode === "recover"
                    ? "NEW WEBSITE PASSWORD"
                    : "WEBSITE PASSWORD"}
                </label>
                <input
                  id="crew-password"
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
                <small>
                  Use your own password for this website. 12 characters minimum
                  when joining.
                </small>
                {mode === "recover" && (
                  <>
                    <label htmlFor="crew-recovery-input">
                      SAVED RECOVERY CODE
                    </label>
                    <input
                      id="crew-recovery-input"
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value.trim())}
                      autoComplete="off"
                      required
                    />
                  </>
                )}
                {mode === "register" && (
                  <label className="crew-check">
                    <input
                      type="checkbox"
                      checked={ranking}
                      onChange={(e) => setRanking(e.target.checked)}
                    />
                    <span>
                      Show my handle and earned points publicly in the weekly
                      Top 10 if I qualify.
                    </span>
                  </label>
                )}
                <button
                  className="button primary"
                  disabled={busy || !state?.configured}
                  type="submit"
                >
                  {busy
                    ? "PLEASE WAIT…"
                    : mode === "register"
                      ? "CREATE CREW ACCOUNT"
                      : mode === "recover"
                        ? "RECOVER ACCOUNT"
                        : "SIGN IN"}
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode(mode === "recover" ? "login" : "recover");
                    setError("");
                  }}
                >
                  {mode === "recover"
                    ? "BACK TO SIGN IN"
                    : "USE A RECOVERY CODE"}
                  <KeyRound size={12} />
                </button>
              </form>
            </section>
          )}
        </aside>
      </div>
      {recovery && (
        <section className="crew-recovery" aria-labelledby="recovery-title">
          <KeyRound size={24} />
          <div>
            <h2 id="recovery-title">Save your recovery code.</h2>
            <p>
              This code is shown once. Keep it private and save it somewhere
              safe; it can reset your website password. We don’t collect an
              email address.
            </p>
            <input
              aria-label="Account recovery code"
              value={recovery}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <label className="crew-check">
              <input
                type="checkbox"
                checked={savedRecovery}
                onChange={(e) => setSavedRecovery(e.target.checked)}
              />
              <span>I saved my recovery code.</span>
            </label>
            <button
              className="button button-outline"
              disabled={!savedRecovery}
              onClick={() => setRecovery("")}
            >
              DONE <Check size={14} />
            </button>
          </div>
        </section>
      )}
      <section className="crew-rewards" id="crew-rewards" aria-labelledby="rewards-title">
        <div className="crew-reward-art" aria-hidden="true">
          <span>CRIMEX HOUSE</span>
          <strong>
            ZERO
            <br />
            <i>ALIBIS.</i>
          </strong>
          <span>{account?.handle ?? "YOUR CREW ID"}</span>
          <small>PERSONAL CREW FILE / SEASON 01</small>
        </div>
        <div className="crew-reward-copy">
          <span className="eyebrow pink">YOUR FIRST UNLOCK</span>
          <h2 id="rewards-title">
            Your name.
            <br />
            On the case.
          </h2>
          <p>
            A personalized Crew ID phone wallpaper. 1080 × 1920 PNG, made with
            your handle and a unique crew-file number.
          </p>
          <span className="reward-cost">
            <Coins size={18} />
            {catalog.reward.credits} CREW CREDITS <small>ONE-TIME UNLOCK</small>
          </span>
          {account?.rewards.includes(catalog.reward.id) ? (
            <a
              href={`/api/crew/reward/${catalog.reward.id}`}
              className="button primary"
              download
            >
              DOWNLOAD YOUR WALLPAPER <Download size={15} />
            </a>
          ) : (
            <button
              className="button primary"
              disabled={
                busy ||
                !account ||
                account.balance < catalog.reward.credits ||
                !account.verified
              }
              onClick={() =>
                void run(async () => {
                  const r = await api<{ account: Wallet; message: string }>(
                    "/api/crew/redeem",
                    { rewardId: catalog.reward.id },
                  );
                  setState((s) => (s ? { ...s, account: r.account } : s));
                  setMessage(r.message);
                })
              }
            >
              {account &&
              account.balance >= catalog.reward.credits &&
              !account.verified
                ? "CREW VERIFICATION REQUIRED"
                : `UNLOCK WITH ${catalog.reward.credits} CREDITS`}
              <LockKeyhole size={14} />
            </button>
          )}
          <small className="mission-fineprint">
            Keep your wallpaper after redeeming. Download it again without
            another credit charge. Credits have no cash value. Personal use
            only.
          </small>
        </div>
      </section>
      <section
        id="weekly-crew"
        className="crew-leaderboard"
        aria-labelledby="leaderboard-title"
      >
        <div className="mission-section-title">
          <div>
            <span className="eyebrow pink">
              <Trophy size={14} /> THE CREW OF THE WEEK
            </span>
            <h2 id="leaderboard-title">Ten places. Earn yours.</h2>
          </div>
          <span className="eyebrow">RESETS MONDAY · 12:00 AM ET</span>
        </div>
        <p>
          Ranked by credits earned this week. Spending credits never lowers your
          ranking. Verified followers who opt in appear publicly.
        </p>
        {standings ? (
          standings.entries.length ? (
            <table>
              <caption className="crew-table-caption">
                Weekly Top 10 · week beginning {standings.week}
              </caption>
              <thead>
                <tr>
                  <th scope="col">RANK</th>
                  <th scope="col">CREW MEMBER</th>
                  <th scope="col">EARNED</th>
                </tr>
              </thead>
              <tbody>
                {standings.entries.map((e) => (
                  <tr
                    className={e.rank <= 3 ? "crew-podium" : ""}
                    key={e.handle}
                  >
                    <td>{String(e.rank).padStart(2, "0")}</td>
                    <td>{e.handle}</td>
                    <td>
                      {e.points} <Coins size={12} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="crew-empty">
              <Trophy size={32} />
              <h3>The first rank is open.</h3>
              <p>
                No verified scores yet this week. Complete a mission and confirm
                your crew account to enter. We only show real qualifying
                participants.
              </p>
            </div>
          )
        ) : (
          <div className="crew-empty">
            <p>
              {state?.configured
                ? "Standings are temporarily unavailable."
                : "Loading this week’s standings…"}
            </p>
            <button className="text-link" onClick={() => void refresh()}>
              REFRESH <RefreshCw size={14} />
            </button>
          </div>
        )}
        <p className="mission-fineprint">
          Ties go to the person who reached the score first, then alphabetical
          handle. Your wallet carries forward. Only weekly earned points reset.
        </p>
      </section>
      {account && (
        <section className="crew-history">
          <div className="mission-section-title">
            <div>
              <span className="eyebrow pink">YOUR PRIVATE RECORD</span>
              <h2>Every credit accounted for.</h2>
            </div>
          </div>
          {account.transactions.length ? (
            <ol>
              {account.transactions.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.label}</strong>
                    <small>
                      {new Date(t.at).toLocaleDateString("en-US", {
                        timeZone: "America/New_York",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · ET
                    </small>
                  </div>
                  <span className={t.amount > 0 ? "pink" : ""}>
                    {t.amount > 0 ? "+" : ""}
                    {t.amount}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>Your first mission will start your credit history.</p>
          )}
        </section>
      )}
      <div className="crew-rules">
        <h2>The crew rules.</h2>
        <p>
          Credits are free to earn and can only unlock the rewards listed here.
          They cannot be bought, transferred, withdrawn, or exchanged for cash.
          The daily maximum is {catalog.dailyLimit}. Existing practice-game
          records are separate from daily missions.
        </p>
        <p>
          Instagram verification is reviewed by the creator. Typing a handle
          doesn’t verify ownership or a follow. Your password, recovery code and
          wallet history stay private. Only opted-in, confirmed crew handles and
          weekly points can appear in the Top 10.
        </p>
        <a
          className="text-link"
          href="https://instagram.com/crimex.house"
          target="_blank"
          rel="noreferrer"
        >
          FOLLOW THE STORY ON INSTAGRAM <ArrowUpRight size={14} />
        </a>
      </div>
      {puzzle && (
        <MissionDialog
          puzzle={puzzle}
          title={activeTitle}
          onClose={() => setPuzzle(null)}
          onClaim={async (answer) => {
            const result = await api<{
              account: Wallet;
              message: string;
              incorrect?: boolean;
            }>("/api/crew/claim", { ticket: puzzle.ticket, answer });
            setState((s) => (s ? { ...s, account: result.account } : s));
            setMessage(result.message);
            if (result.incorrect) throw new Error(result.message);
            setPuzzle(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}
function MissionDialog({
  puzzle,
  title,
  onClose,
  onClaim,
}: {
  puzzle: Puzzle;
  title: string;
  onClose: () => void;
  onClaim: (answer: unknown) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [answer, setAnswer] = useState(""),
    [choice, setChoice] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [open, setOpen] = useState<number[]>([]),
    [matched, setMatched] = useState<number[]>([]),
    [trace, setTrace] = useState<number[]>([]);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      dialog?.close();
    };
  }, []);
  async function submit(value: unknown) {
    setBusy(true);
    setError("");
    try {
      await onClaim(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  function flip(index: number) {
    if (
      busy ||
      open.length >= 2 ||
      matched.includes(index) ||
      open.includes(index) ||
      trace.length >= 36
    )
      return;
    const selected = [...open, index];
    setOpen(selected);
    if (selected.length === 2) {
      setTrace((t) => [...t, ...selected]);
      if (puzzle.deck?.[selected[0]] === puzzle.deck?.[selected[1]]) {
        setMatched((m) => [...m, ...selected]);
        setOpen([]);
      } else timer.current = setTimeout(() => setOpen([]), 700);
    }
  }
  return (
    <dialog
      className="mission-dialog"
      ref={ref}
      onCancel={onClose}
      aria-labelledby="daily-dialog-title"
    >
      <button
        className="icon-button close-modal"
        aria-label="Close daily mission"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="eyebrow pink">
        DAILY MISSION / SERVER-CHECKED COMPLETION
      </span>
      <h2 id="daily-dialog-title">{title}</h2>
      <p>{puzzle.prompt}</p>
      {puzzle.kind === "cipher" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(answer);
          }}
        >
          <label htmlFor="daily-code">FOUR-DIGIT COMBINATION</label>
          <input
            id="daily-code"
            value={answer}
            onChange={(e) =>
              setAnswer(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            autoComplete="off"
            required
          />
          <button
            className="button primary"
            disabled={busy || answer.length !== 4}
          >
            SUBMIT COMBINATION <ArrowRight size={15} />
          </button>
        </form>
      )}
      {puzzle.kind === "briefing" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(choice);
          }}
        >
          <fieldset>
            <legend>YOUR ASSESSMENT</legend>
            {puzzle.choices?.map((label, i) => (
              <label className="briefing-choice" key={label}>
                <input
                  type="radio"
                  name="daily-briefing"
                  checked={choice === i}
                  onChange={() => setChoice(i)}
                  required
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <button className="button primary" disabled={busy || choice === null}>
            FILE YOUR ANSWER <ArrowRight size={15} />
          </button>
        </form>
      )}
      {puzzle.kind === "memory" && (
        <>
          <div className="mission-memory-grid">
            {puzzle.deck?.map((symbol, i) => (
              <button
                key={i}
                className={matched.includes(i) ? "memory-matched" : ""}
                onClick={() => flip(i)}
                disabled={busy || matched.includes(i)}
                aria-label={
                  matched.includes(i)
                    ? `Matched evidence ${i + 1}: ${symbol}`
                    : open.includes(i)
                      ? `Evidence ${i + 1}: ${symbol}`
                      : `Reveal evidence ${i + 1}`
                }
              >
                <span>
                  {open.includes(i) || matched.includes(i)
                    ? symbol
                    : String(i + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          <p className="eyebrow">
            {trace.length / 2} / 18 MOVES · {matched.length / 2} / 6 PAIRS
          </p>
          {trace.length >= 36 && matched.length < 12 && (
            <p>Move limit reached. Close this mission and start a fresh run.</p>
          )}
          <button
            className="button primary"
            disabled={busy || matched.length !== 12}
            onClick={() => void submit(trace)}
          >
            CLAIM DAILY CREDITS <Coins size={15} />
          </button>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <small>
        Mission tickets expire after 15 minutes or at midnight ET. Your balance
        changes only after the server confirms completion.
      </small>
    </dialog>
  );
}
