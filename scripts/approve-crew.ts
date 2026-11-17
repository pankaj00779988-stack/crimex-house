import { readFile, writeFile } from "node:fs/promises";
const [rawHandle, code, revoke] = process.argv.slice(2);
if (
  !/^@?[a-zA-Z0-9._]{1,30}$/.test(rawHandle ?? "") ||
  (code !== "--revoke" && !/^CREW-[A-F0-9]{10}$/.test(code ?? "")) ||
  revoke
) {
  throw new Error(
    "After checking the person's DM and follow, use: npm run crew:approve -- @handle CREW-XXXXXXXXXX (or @handle --revoke).",
  );
}
const handle = `@${rawHandle.replace(/^@/, "").toLowerCase()}`;
const path = new URL("../data/crew.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
data.verifiedCrew = data.verifiedCrew.filter(
  (p: { handle: string }) => p.handle !== handle,
);
if (code !== "--revoke") data.verifiedCrew.push({ handle, code });
await writeFile(path, JSON.stringify(data, null, 2) + "\n");
console.log(
  `${handle}: ${code === "--revoke" ? "confirmation removed" : "confirmation saved"}. Commit and redeploy to publish this change.`,
);
