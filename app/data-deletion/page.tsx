import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Data deletion",
  description:
    "Delete a CRIMEX HOUSE crew account or request help with Instagram verification data.",
};

export default function DataDeletionPage() {
  return (
    <main id="main" className="page-container subpage policy-page">
      <header className="page-title">
        <span className="eyebrow pink">CRIMEX HOUSE · ACCOUNT CONTROL</span>
        <h1>Delete your <span>crew data.</span></h1>
        <p>Last updated: <time dateTime="2026-11-18">18 November 2026</time></p>
      </header>
      <article className="policy-content" aria-label="Data-deletion instructions">
        <section>
          <h2>Delete your website account</h2>
          <ol>
            <li>
              Open <Link href="/missions#crew-account">Daily Missions</Link>{" "}
              and sign in to the crew account you want to delete.
            </li>
            <li>In your crew account panel, open <strong>ACCOUNT SETTINGS</strong>.</li>
            <li>Enter your website password in <strong>CONFIRM WEBSITE PASSWORD</strong>.</li>
            <li>Select <strong>DELETE MY CREW ACCOUNT</strong>.</li>
          </ol>
          <p>
            Deletion removes the active account record, including its credit
            balance and transaction history, reward entitlements, sign-in
            sessions, leaderboard preference and linked Instagram verification
            information. Your account will no longer qualify for the public
            leaderboard. Deletion is permanent; save any downloaded reward you
            want to keep first.
          </p>
        </section>
        <section>
          <h2>Get help or request deletion</h2>
          <p>
            If you cannot sign in, use your saved recovery code through the
            website&apos;s recovery form. If that is unavailable, or you only
            contacted the Instagram integration, DM{" "}
            <a href={siteConfig.instagramUrl}>@crimex.house on Instagram</a>{" "}
            from the relevant account with the words <strong>DATA DELETION</strong>
            {" "}and the Instagram handle concerned. The creator handles these
            requests manually and may ask you to demonstrate account ownership.
            This phrase is not an automatic deletion command.
          </p>
          <p>
            Do not send a password, recovery code or access token. Accounts
            holding website owner access need administrator assistance before
            deletion so the project is not locked out.
          </p>
        </section>
        <section>
          <h2>Information held separately</h2>
          <p>
            Account deletion does not clear local browser game progress; use
            your browser&apos;s site-data controls for that. It also does not
            delete DMs held by Instagram or remove another platform&apos;s
            records. Manage those through that platform.
          </p>
          <p>
            Separate security records, hashed webhook delivery receipts,
            provider logs or backups may remain until their retention or
            cleanup processes remove them. See the{" "}
            <Link href="/privacy">privacy policy</Link> for the information
            processed by the current website and Instagram verification feature.
          </p>
        </section>
      </article>
    </main>
  );
}
