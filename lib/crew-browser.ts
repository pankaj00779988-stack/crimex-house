// Existing guest keys remain compatible; account drafts stay separate and local.
export const crewDraftKey = (handle?: string) =>
  handle ? `crimex:crew:draft:${handle}` : "crimex:crew:draft";
export const crewCompletionKey = (episode: string, handle?: string) =>
  `crimex:crew:${episode}${handle ? `:${handle}` : ""}`;
