import type { Episode } from "./data";

export interface ReleaseState {
  status: string;
  isReleased?: boolean;
  reelUrl?: string;
}

export function isInstagramReelUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["instagram.com", "www.instagram.com"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      /^\/(?:reel|reels)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** The clock never releases content. Both editorial fields must be ready. */
export function isEpisodeReleased(episode: ReleaseState): boolean {
  return (
    episode.status !== "LOCKED" &&
    episode.isReleased === true &&
    isInstagramReelUrl(episode.reelUrl ?? "")
  );
}

export function getWatchUrl(episode: ReleaseState, profileUrl: string): string {
  return isEpisodeReleased(episode) ? episode.reelUrl! : profileUrl;
}

/** Keep unreleased story details out of server-rendered card props as well. */
export function getPublicEpisode(episode: Episode): Episode {
  if (isEpisodeReleased(episode)) return episode;
  return {
    id: episode.id,
    part: episode.part,
    title: episode.title,
    status: episode.status,
    isReleased: false,
    reelUrl: "",
    teaser: episode.teaser,
    subtitle: episode.teaser ?? "Intelligence not yet released.",
    image: episode.image,
    runtime: episode.runtime,
  };
}
