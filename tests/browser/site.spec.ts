import { test, expect, type Page } from "@playwright/test";
import episodes from "../../data/episodes.json";
import { isEpisodeReleased } from "../../lib/release";

const episode = episodes.find((item) => item.status === "LIVE")!;
const released = isEpisodeReleased(episode);

test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL && ["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
    // Vercel serves Analytics itself; a local Next server has no Insights route.
    await page.route("**/_vercel/insights/script.js", (route) =>
      route.fulfill({ contentType: "application/javascript", body: "void 0;" }),
    );
  }
});

async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.width + 1);
}
async function imagesReady(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
}

test("episode-first discovery and mobile mission browsing preserve the release gate", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator(".announcement")).toContainText("NEXT PART IN PRODUCTION");
  await expect(page.locator(".announcement .countdown")).toHaveCount(0);
  await expect(page.locator(".vote-instruction")).toContainText("Post your choice in the Instagram comments to vote.");
  const caseTop = await page.locator(".hq-case-section").evaluate((el) => el.getBoundingClientRect().top);
  const missionTop = await page.locator(".hq-missions-callout").evaluate((el) => el.getBoundingClientRect().top);
  expect(caseTop).toBeLessThan(missionTop);
  await expect(page.locator(".hud")).toContainText("$5,000,000");
  await page.goto("/files");
  await expect(page.getByRole("button", { name: "Part 2 locked" })).toBeDisabled();
  await page.goto("/board");
  await expect(page.locator(".crew-next")).toContainText("Part 01 is live.");

  // Exercise the guest journey without creating accounts or touching a real wallet.
  await page.route("**/api/crew", (route) => route.fulfill({ json: {
    configured: true, account: null, day: "2026-11-17", week: "2026-11-16",
    resetAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  } }));
  await page.route("**/api/crew/leaderboard", (route) => route.fulfill({ json: {
    week: "2026-11-16", nextWeek: "2026-11-23", entries: [],
  } }));
  await page.goto("/missions");
  await expect(page.locator(".mission-reward-preview")).toContainText("40 credits");
  if ((page.viewportSize()?.width ?? 0) <= 800) {
    const formTop = await page.locator(".crew-account-panel").evaluate((el) => el.getBoundingClientRect().top);
    for (const selector of [".mission-reward-preview", ".daily-mission"])
      expect(await page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(formTop);
  }
  if (info.project.name === "phone-375") {
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Case files" })).toHaveCSS("font-size", "10px");
  }
  await page.getByRole("button", { name: "JOIN TO EARN" }).first().click();
  await expect(page.getByLabel("INSTAGRAM HANDLE", { exact: true })).toBeFocused();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("missions-discovery.png"), fullPage: true });
});

test("HQ artwork, six responsive pages, channel links, and episode release state", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  for (const path of [
    "/",
    "/files",
    "/board",
    "/safe",
    "/games",
    "/missions",
  ]) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await imagesReady(page);
    await noOverflow(page);
    await expect(
      page.locator('a[href="https://youtube.com/@crimex_house"]').first(),
    ).toBeAttached();
    await expect(
      page.locator('a[href*="gumroad"], a[href*="rzp.io"]'),
    ).toHaveCount(0);
    if (path === "/") {
      await expect(
        page.getByRole("link", {
          name: released ? "WATCH PART 01" : "FOLLOW @CRIMEX.HOUSE FOR PART 01",
        }),
      ).toHaveAttribute(
        "href",
        released ? episode.reelUrl! : "https://instagram.com/crimex.house",
      );
      if (released) {
        await expect(page.locator(".cinema-stamp")).toContainText("LIVE NOW");
        await expect(page.locator(".vote-widget")).toContainText("VOTING OPEN");
        await expect(page.locator(".vote-widget")).not.toContainText(
          "CREW VOTE LOCKED",
        );
        for (const name of ["LIKE ON INSTAGRAM", "COMMENT YOUR THEORY"])
          await expect(page.getByRole("link", { name })).toHaveAttribute(
            "href",
            episode.reelUrl!,
          );
      }
      await expect(
        page.getByRole("link", { name: "ENTER ROOM 17" }),
      ).toHaveAttribute("href", "/games#room-17");
      await page.evaluate(() => window.scrollTo(0, 0));
      if (info.project.name === "phone-375")
        await expect(page.locator(".avatar > span")).toBeVisible();
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeFocused();
      await expect(skip).toHaveCSS("clip-path", "none");
      await skip.evaluate((node) => (node as HTMLElement).blur());
      await page.screenshot({
        path: info.outputPath("hq.png"),
        fullPage: true,
      });
    }
    if (path === "/files") {
      const opener = page.getByRole("button", {
        name: "Open Part 1: 110 POUNDS",
      });
      await opener.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      if (released) {
        await expect(dialog).toContainText("Bundle #50");
        await expect(dialog).toContainText("31 U.S.C. § 5324");
        await expect(
          dialog.getByRole("link", { name: "Watch on Instagram" }),
        ).toHaveAttribute("href", episode.reelUrl!);
      } else {
        await expect(dialog).toContainText(
          "declassifies when the Reel goes live",
        );
        await expect(dialog).not.toContainText("Bundle #50");
      }
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
    }
    if (path === "/safe") {
      if (released)
        await expect(
          page.getByRole("button", { name: "Digit 1", exact: true }),
        ).toBeEnabled();
      else
        await expect(
          page.getByRole("heading", { name: /VAULT SEALED UNTIL PART/ }),
        ).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test("released Part 01 saves a choice and unlocks the episode vault", async ({
  page,
}) => {
  test.skip(!released, "Part 01 has not been released.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const decoy = page.getByRole("button", { name: /DECOY/ });
  await decoy.click();
  await expect(decoy).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("link", { name: "COMMENT DECOY", exact: true }),
  ).toHaveAttribute("href", episode.reelUrl!);
  await expect(page.locator(".vote-bottom")).toContainText(
    "Post it on the Reel to cast your vote.",
  );
  await page.reload();
  await expect(decoy).toHaveAttribute("aria-pressed", "true");
  await page.goto("/safe");
  await page.getByRole("button", { name: "SFX ON", exact: true }).click();
  for (const digit of "0000")
    await page
      .getByRole("button", { name: `Digit ${digit}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Submit combination" }).click();
  await expect(page.locator(".attempt-count")).toContainText("4 / 5");
  expect(await page.evaluate(() => localStorage.getItem("crimex:misses"))).toBe(
    "1",
  );
  for (const digit of "1150")
    await page
      .getByRole("button", { name: `Digit ${digit}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Submit combination" }).click();
  await expect(page.locator(".unlock-dossier")).toContainText(
    "YOU CRACKED IT.",
  );
  await noOverflow(page);
  await page.getByLabel("YOUR INSTAGRAM HANDLE").fill("@release.check");
  await page.getByRole("button", { name: "LOG COMPLETION" }).click();
  await expect(page.locator(".completion-confirmation")).toContainText(
    "@release.check",
  );
  await page.reload();
  await expect(page.locator(".completion-confirmation")).toContainText(
    "@release.check",
  );
  await page.goto("/");
  await expect(page.locator(".hud .suspicion strong")).toContainText("39%");
  expect(errors).toEqual([]);
});

test("Room 17 plays through to a clean exit and restores its report after reload", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/games#room-17");
  await imagesReady(page);
  await page
    .getByRole("button", { name: "ENTER ROOM 17", exact: true })
    .click();
  const clues = page.locator(".heist-clues");
  await clues.getByRole("button", { name: /Brass key/ }).click();
  await clues.getByRole("button", { name: /Desk clock/ }).click();
  await expect(page.locator(".heist-note")).toContainText("09:40");
  await clues.getByRole("button", { name: /Evacuation map/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("CASE COMBINATION").fill("0940");
  await page.getByRole("button", { name: "UNLOCK", exact: true }).click();
  await expect(
    page.getByText("BLACK LEDGER RECOVERED", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("room17-playing.png"),
    fullPage: true,
  });
  await page
    .locator(".heist-exit-grid")
    .getByRole("button", { name: /Service stairs/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "You were never here." }),
  ).toBeVisible();
  await expect(page.getByText("GHOST", { exact: true })).toBeVisible();
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("crimex:room-17:best:v1")!),
  );
  expect(record.outcome).toBe("ghost");
  expect(record.moves).toBe(5);
  expect(
    await page.evaluate(() => localStorage.getItem("crimex:misses")),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You were never here." }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("room17-report.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "RUN IT AGAIN" }).click();
  await expect(clues).toBeVisible();
  await page.locator(".quick-drills > summary").click();
  await expect(
    page.getByRole("button", { name: "START DEAD DROP" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
