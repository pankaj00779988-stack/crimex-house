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
  Youtube,
  Gamepad2,
  Coins,
} from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig, latestEpisode, latestEpisodeReleased } from "@/lib/data";
import { upcomingRelease } from "@/lib/schedule";
import { isNumber, useStoredState } from "@/lib/storage";
import { Avatar } from "./art";
const navigation = [
  { href: "/", label: "HQ", shortLabel: "HQ", icon: House },
  {
    href: "/files",
    label: "Case files",
    shortLabel: "Files",
    icon: FolderOpen,
  },
  { href: "/safe", label: "The safe", shortLabel: "Safe", icon: LockKeyhole },
  { href: "/board", label: "The board", shortLabel: "Board", icon: Network },
  { href: "/games", label: "Games", shortLabel: "Games", icon: Gamepad2 },
  { href: "/missions", label: "Missions", shortLabel: "Missions", icon: Coins },
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
  const [release, setRelease] =
    useState<ReturnType<typeof upcomingRelease>>(null);
  useEffect(() => {
    const tick = () => {
      setRelease(
        upcomingRelease(siteConfig.nextReleaseAt, siteConfig.countdownTimeZone),
      );
    };
    const initial = setTimeout(tick, 0);
    if (!siteConfig.nextReleaseAt) return () => clearTimeout(initial);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="announcement">
      <div className="announcement-inner">
        <span>
          <Radio size={13} />
          <span className="announcement-copy">
            {release
              ? `NEXT DROP · ${release.label}`
              : latestEpisodeReleased
                ? `PART ${String(latestEpisode.part).padStart(2, "0")} LIVE · NEXT PART IN PRODUCTION`
                : "THE NEXT CASE IS IN PRODUCTION"}
          </span>
          <span className="announcement-mobile">
            {release
              ? release.label
              : latestEpisodeReleased
                ? `PART ${String(latestEpisode.part).padStart(2, "0")} LIVE`
                : "NEXT PART IN PRODUCTION"}
          </span>
        </span>
        {release ? (
          <span
            className="countdown"
            aria-label={`Next drop in ${release.countdown}`}
          >
            {release.countdown}
          </span>
        ) : (
          <a
            className="announcement-link"
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            GET UPDATES <ArrowUpRight size={13} />
          </a>
        )}
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
            {navigation.map(({ href, label, shortLabel, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={path === href ? "nav-link active" : "nav-link"}
                aria-current={path === href ? "page" : undefined}
                aria-label={label}
              >
                <Icon size={14} />
                <span className="nav-label-full">{label}</span>
                <span className="nav-label-short" aria-hidden="true">
                  {shortLabel}
                </span>
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
        <div className="footer-socials" aria-label="Follow the crew">
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={16} />
            {siteConfig.handle}
            <ArrowUpRight size={14} />
          </a>
          <a
            href={siteConfig.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the crew on YouTube (opens in a new tab)"
          >
            <Youtube size={16} />
            <span>YouTube · {siteConfig.youtubeHandle}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <nav className="footer-policies" aria-label="Privacy and account data">
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/data-deletion">Data deletion</Link>
      </nav>
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
