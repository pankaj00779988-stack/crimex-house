"use client";
import { useRef, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/data";

export function CrewVerification({
  code,
  handle,
}: {
  code: string;
  handle: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Crew code copied. Paste it into your Instagram DM.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage(
        "Copy the selected code, then paste it into your Instagram DM.",
      );
    }
  }
  return (
    <div className="crew-verification">
      <h3>Waiting for creator approval.</h3>
      <p>
        Earn credits now. Complete these steps to unlock rewards and weekly
        ranking eligibility.
      </p>
      <ol className="crew-verification-steps">
        <li>
          Follow{" "}
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            @crimex.house
          </a>
          .
        </li>
        <li>Copy your code below.</li>
        <li>
          DM it to @crimex.house from <strong>{handle}</strong>.
        </li>
        <li>
          The creator checks your code and follow, then approves your account.
        </li>
      </ol>
      <label className="crew-code-label" htmlFor="crew-verification-code">
        YOUR CREW CODE
      </label>
      <input
        ref={input}
        id="crew-verification-code"
        aria-label="Instagram verification code"
        className="crew-code"
        value={code}
        readOnly
        onFocus={(e) => e.target.select()}
      />
      <div className="crew-verification-actions">
        <button
          type="button"
          className="button button-outline"
          onClick={() => void copy()}
        >
          <Copy size={15} /> COPY CREW CODE
        </button>
        <a
          className="button primary"
          href="https://ig.me/m/crimex.house"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={15} /> OPEN INSTAGRAM DM
        </a>
      </div>
      <p className="mission-fineprint" role="status">
        {message}
      </p>
      <p className="mission-fineprint">
        Approval is manual. Return here and refresh after the creator reviews
        your DM. Public rankings also require your opt-in.
      </p>
    </div>
  );
}
