"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Radio,
  Crosshair,
  Banknote,
  Landmark,
  Fingerprint,
  House,
  FolderOpen,
  LockKeyhole,
  Network,
  Instagram,
} from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig, activeEpisode, activeEpisodeReleased } from "@/lib/data";
import { nextDrop } from "@/lib/game";
import { isNumber, useStoredState } from "@/lib/storage";
import { Avatar } from "./art";
const navigation = [
  { href: "/", label: "HQ", icon: House },
  { href: "/files", label: "Case files", icon: FolderOpen },
  { href: "/safe", label: "The safe", icon: LockKeyhole },
  { href: "/board", label: "The board", icon: Network },
];
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Crimex House headquarters">
      <span className="brand-mark">
        <House size={24} strokeWidth={2.5} />
        <span />
      </span>
      <span>
        CRIMEX<span className="brand-house">HOUSE</span>
      </span>
    </Link>
  );
}
export function Announcement() {
  const [countdown, setCountdown] = useState("-- : -- : --");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const seconds = Math.max(
        0,
        Math.floor(
          (nextDrop(
            now,
            siteConfig.countdownTargetHour,
            siteConfig.countdownTimeZone,
          ) -
            now.getTime()) /
            1000,
        ),
      );
      setCountdown(
        [
          Math.floor(seconds / 3600),
          Math.floor(seconds / 60) % 60,
          seconds % 60,
        ]
          .map((v) => String(v).padStart(2, "0"))
          .join(" : "),
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="announcement">
      <div className="announcement-inner">
        <span>
          <Radio size={13} />
          <span className="announcement-copy">
            {activeEpisodeReleased
              ? `THE NEXT MOVE DROPS AT ${siteConfig.dropLabel}`
              : `SEASON ${String(siteConfig.season).padStart(2, "0")} · PART ${String(activeEpisode.part).padStart(2, "0")} DROPS AT ${siteConfig.dropLabel}`}
          </span>
          <span className="announcement-mobile">
            {activeEpisodeReleased
              ? `NEXT DROP · ${siteConfig.dropLabel}`
              : `SEASON ${String(siteConfig.season).padStart(2, "0")} · PART ${String(activeEpisode.part).padStart(2, "0")} DROPS AT ${siteConfig.dropLabel}`}
          </span>
        </span>
        <span className="countdown" aria-label={`Next drop in ${countdown}`}>
          {countdown}
          <ArrowUpRight size={13} />
        </span>
      </div>
    </div>
  );
}
export function Header() {
  const path = usePathname();
  return (
    <>
      <Announcement />
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={path === href ? "nav-link active" : "nav-link"}
                aria-current={path === href ? "page" : undefined}
              >
                <Icon size={14} />
                {label}
                {href === "/safe" && <span className="nav-dot" />}
              </Link>
            ))}
          </nav>
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="social-link"
          >
            <Avatar />
            <span>{siteConfig.handle}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
    </>
  );
}
export function Hud() {
  const [misses] = useStoredState("crimex:misses", 0, isNumber);
  const suspicion = Math.min(
    100,
    siteConfig.initialSuspicion + misses * siteConfig.suspicionPerMiss,
  );
  return (
    <section className="hud" aria-label="Heist status">
      <div>
        <Banknote />
        <span>
          <span className="eyebrow">CASH ON HAND</span>
          <strong>${siteConfig.cash.toLocaleString("en-US")}</strong>
        </span>
        <span className="hud-note">UNTRACEABLE. FOR NOW.</span>
      </div>
      <div>
        <Landmark />
        <span>
          <span className="eyebrow">SUCCESSFULLY BANKED</span>
          <strong>${siteConfig.banked.toLocaleString("en-US")}</strong>
        </span>
        <span className="hud-note">THE HARD PART.</span>
      </div>
      <div className="suspicion">
        <Crosshair />
        <span>
          <span className="eyebrow">SUSPICION LEVEL</span>
          <strong>
            {suspicion}%
            <span className="suspicion-meter">
              <span style={{ width: `${suspicion}%` }} />
            </span>
          </strong>
        </span>
        <span className="hud-note pink">EYES ON YOU.</span>
      </div>
    </section>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Brand />
        <p>
          A fictional heist. Real consequences.
          <br />
          <span>You decide how this ends.</span>
        </p>
        <a href={siteConfig.instagramUrl} target="_blank" rel="noreferrer">
          <Instagram size={16} />
          {siteConfig.handle}
          <ArrowUpRight size={14} />
        </a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getUTCFullYear()} CRIMEX HOUSE</span>
        <span>
          <Fingerprint size={12} /> EVERY MOVE LEAVES A TRACE.
        </span>
        <span>FICTIONAL SERIES · NOT FINANCIAL OR LEGAL ADVICE</span>
      </div>
    </footer>
  );
}
