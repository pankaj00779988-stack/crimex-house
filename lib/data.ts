import episodeData from "@/data/episodes.json";
import config from "@/data/siteConfig.json";
export { default as siteConfig } from "@/data/siteConfig.json";
export { default as corkboard } from "@/data/corkboard.json";
export interface Episode {
  id: string;
  part: number;
  title: string;
  status: string;
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
  if (
    episode.status !== "LOCKED" &&
    (!episode.summary || !episode.realLawRule)
  ) {
    throw new Error(
      `Released episode ${episode.id} needs a summary and realLawRule.`,
    );
  }
}
export const activeEpisode = episodes.find(
  (episode) => episode.status === "LIVE",
)!;
if (
  !/^\d{4}$/.test(activeEpisode.safeCode ?? "") ||
  !activeEpisode.safeClue ||
  activeEpisode.choices?.length !== 2 ||
  !activeEpisode.initialVotes ||
  !Object.values(activeEpisode.initialVotes).every(
    (count) => Number.isSafeInteger(count) && count >= 0,
  )
) {
  throw new Error(
    "The LIVE episode needs a four-digit safeCode, safeClue, two choices, and nonnegative initialVotes.",
  );
}
if (
  !Number.isInteger(config.countdownTargetHour) ||
  config.countdownTargetHour < 0 ||
  config.countdownTargetHour > 23 ||
  config.countdownTimeZone !== "UTC"
) {
  throw new Error("Countdown must use a target hour from 0–23 in UTC.");
}
