import episodeData from "@/data/episodes.json";
import config from "@/data/siteConfig.json";
import { isEpisodeReleased, isInstagramReelUrl } from "./release";
import { releaseTime } from "./schedule";
export { default as siteConfig } from "@/data/siteConfig.json";
import boardData from "@/data/corkboard.json";
export const corkboard = {
  ...boardData,
  persons: boardData.persons as { handle: string; number: string }[],
};
export interface Episode {
  id: string;
  part: number;
  title: string;
  status: string;
  isReleased?: boolean;
  vaultReady?: boolean;
  reelUrl?: string;
  teaser?: string;
  subtitle: string;
  image?: string;
  location?: string;
  runtime?: string;
  choices?: string[];
  initialVotes?: { optionA: number; optionB: number };
  realLawRule?: string;
  voteHeading?: string;
  voteContext?: string;
  choiceStrategies?: string[];
  lawExplanation?: string;
  summary?: string;
  safeCode?: string;
  safeClue?: string;
  recoveredIntelligence?: string;
  unlockMessage?: string;
  exhibitNote?: string;
  timestamp?: string;
}
export const episodes: Episode[] = episodeData;
// Validate editorial data at build time so a malformed daily update cannot ship silently.
if (episodes.filter((episode) => episode.status === "LIVE").length !== 1) {
  throw new Error("episodes.json must contain exactly one LIVE episode.");
}
if (new Set(episodes.map((episode) => episode.id)).size !== episodes.length) {
  throw new Error("Every episode needs a unique, stable id.");
}
for (const episode of episodes) {
  if (!["LIVE", "LOCKED", "ARCHIVED"].includes(episode.status)) {
    throw new Error(
      `Invalid status for ${episode.id}. Use LIVE, LOCKED, or ARCHIVED.`,
    );
  }
  if (episode.status !== "LOCKED" && !episode.summary) {
    throw new Error(`Released episode ${episode.id} needs a summary.`);
  }
  if (episode.isReleased && !isInstagramReelUrl(episode.reelUrl ?? "")) {
    throw new Error(
      `Released episode ${episode.id} needs a valid HTTPS Instagram Reel URL.`,
    );
  }
}
export const activeEpisode = episodes.find(
  (episode) => episode.status === "LIVE",
)!;
export const activeEpisodeReleased = isEpisodeReleased(activeEpisode);
// Reel releases and vault puzzles can be published independently.
export const latestEpisode =
  episodes.filter(isEpisodeReleased).sort((a, b) => b.part - a.part)[0] ??
  activeEpisode;
export const latestEpisodeReleased = isEpisodeReleased(latestEpisode);
export const vaultEpisode =
  episodes
    .filter(
      (episode) => isEpisodeReleased(episode) && episode.vaultReady !== false,
    )
    .sort((a, b) => b.part - a.part)[0] ?? activeEpisode;
if (
  activeEpisode.choices?.length !== 2 ||
  !activeEpisode.initialVotes ||
  !Object.values(activeEpisode.initialVotes).every(
    (count) => Number.isSafeInteger(count) && count >= 0,
  )
) {
  throw new Error(
    "The LIVE episode needs two choices and nonnegative initialVotes.",
  );
}
if (
  vaultEpisode.vaultReady !== false &&
  (!/^\d{4}$/.test(vaultEpisode.safeCode ?? "") || !vaultEpisode.safeClue)
) {
  throw new Error(
    "The playable vault needs a four-digit safeCode and safeClue.",
  );
}
if (
  !Number.isInteger(config.countdownTargetHour) ||
  config.countdownTargetHour < 0 ||
  config.countdownTargetHour > 23
) {
  throw new Error("Countdown must use a target hour from 0–23.");
}
new Intl.DateTimeFormat("en-US", {
  timeZone: config.countdownTimeZone,
}).format();
if (
  config.nextReleaseAt !== null &&
  releaseTime(config.nextReleaseAt) === null
) {
  throw new Error(
    "nextReleaseAt must be null or a dated ISO timestamp with a timezone.",
  );
}
