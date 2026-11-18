import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How CRIMEX HOUSE handles crew accounts, Instagram verification, website storage and privacy requests.",
};

export default function PrivacyPage() {
  return (
    <main id="main" className="page-container subpage policy-page">
      <header className="page-title">
        <span className="eyebrow pink">CRIMEX HOUSE · YOUR INFORMATION</span>
        <h1>Privacy <span>policy.</span></h1>
        <p>Last updated: <time dateTime="2026-11-18">18 November 2026</time></p>
      </header>
      <article className="policy-content" aria-label="Privacy policy">
        <section>
          <h2>Who this policy covers</h2>
          <p>
            CRIMEX HOUSE operates this fictional story website and the CRIMEX
            HOUSE Crew Instagram integration for @crimex.house. This policy
            explains how the current free website and crew features use your
            information. Contact the creator through{" "}
            <a href={siteConfig.instagramUrl}>@crimex.house on Instagram</a>{" "}
            with privacy questions or requests.
          </p>
        </section>
        <section>
          <h2>Information used by the website</h2>
          <ul>
            <li>
              <strong>Crew accounts:</strong> your Instagram handle, a separate
              website password stored as a hash, a hashed recovery code,
              sign-in sessions and a CREW verification code.
            </li>
            <li>
              <strong>Crew activity:</strong> mission attempts and claims,
              credit balances and transactions, unlocked rewards, verification
              status and history, and your public-ranking preference.
            </li>
            <li>
              <strong>Device and service information:</strong> browser storage
              for game progress and choices, sign-in cookies, security and
              rate-limit records, hosting request logs and website usage
              statistics through Vercel Web Analytics. Hosting may process your
              IP address, browser and device information, and request details.
            </li>
          </ul>
          <p>
            Current crew registration does not ask for your Instagram password,
            email address, payment details or a crypto wallet. Use a separate
            password for this website.
          </p>
        </section>
        <section>
          <h2>Instagram DM verification</h2>
          <p>
            When you DM your website CREW code to @crimex.house, the integration
            processes the incoming message, sender and recipient identifiers,
            message identifier and timestamp. For a message containing a CREW
            code, it asks Meta for the sender&apos;s Instagram username and
            whether that person follows @crimex.house. It compares these with
            the website account to decide whether to approve crew membership.
          </p>
          <p>
            The website does not keep a general copy of DM text. It stores a
            hashed message identifier and processing time to avoid processing
            the same verification twice. Approved accounts may also retain
            their Instagram-scoped sender identifier and verification history.
            Instagram retains messages separately under Meta&apos;s own policies.
          </p>
          <p>
            A follow is checked when verification is requested; continuous
            unfollow monitoring is not implemented. The creator can review an
            unsuccessful check manually. The integration currently updates
            website membership status without sending an automatic DM reply.
          </p>
        </section>
        <section>
          <h2>Why information is used and who can see it</h2>
          <p>
            Information is used to run your account, save progress, protect
            sign-ins, prevent duplicate rewards, verify eligible followers and
            provide crew rewards. The creator can review crew handles,
            eligibility and activity through a private owner dashboard.
          </p>
          <p>
            Your handle, weekly points and rank appear on the weekly leaderboard
            only if you opt in, are verified and have qualifying earned points.
            You can turn this preference off in Account Settings. Passwords,
            recovery codes and private verification details are not published.
            Current crew features do not sell account information or use it for
            advertising targeting.
          </p>
        </section>
        <section>
          <h2>Service providers and security</h2>
          <p>
            Vercel hosts the website and supplies operational logs and usage
            statistics. Neon stores private crew records. Meta supplies
            Instagram account, messaging and follow information used for
            verification. These providers process the information needed to
            provide their services and may process it outside your country.
            Following an Instagram or YouTube link takes you to that
            platform&apos;s service and privacy policy.
          </p>
          <p>
            Website passwords and recovery codes are hashed, owner Meta
            credentials are encrypted in private storage, and account access
            uses a secure HttpOnly session cookie lasting up to 30 days. Owner
            access is restricted. These protections do not eliminate every
            security risk.
          </p>
        </section>
        <section>
          <h2>Retention and your choices</h2>
          <p>
            Account records are kept while your crew account exists. Some
            activity histories are limited in size. Deleting your account
            removes its active account record, including its wallet, sessions,
            rewards, ranking preference and linked verification information.
            Separate security records, hashed delivery receipts, provider logs
            or backups may remain until their retention or cleanup processes
            remove them; this page does not promise immediate deletion from
            those systems.
          </p>
          <p>
            Read the <Link href="/data-deletion">data-deletion instructions</Link>{" "}
            to delete an account or request help. You can clear local game
            progress through your browser&apos;s site-data controls. Deleting a
            website account does not delete messages held by Instagram.
          </p>
          <p>
            For access, correction or other privacy requests, message{" "}
            <a href={siteConfig.instagramUrl}>@crimex.house</a> from the account
            concerned. We may need to confirm account ownership. Never include
            a password, recovery code or Meta access token in your request.
          </p>
        </section>
        <section>
          <h2>Future features and policy changes</h2>
          <p>
            Paid digital-store features are future plans. Current crew
            participation is free and Crew Credits are not money. This policy
            will be updated when information practices change; check the date
            above for the latest version.
          </p>
        </section>
      </article>
    </main>
  );
}
