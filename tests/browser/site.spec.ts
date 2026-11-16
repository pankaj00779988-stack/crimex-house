import { test, expect, type Page } from "@playwright/test";

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

test("HQ artwork, five responsive pages, channel links, and teaser dialog", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  for (const path of ["/", "/files", "/board", "/safe", "/games"]) {
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
        page.getByRole("link", { name: "FOLLOW @CRIMEX.HOUSE FOR PART 01" }),
      ).toHaveAttribute("href", "https://instagram.com/crimex.house");
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
      await expect(dialog).toContainText(
        "declassifies when the Reel goes live",
      );
      await expect(dialog).not.toContainText("Bundle #50");
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
    }
    if (path === "/safe")
      await expect(
        page.getByRole("heading", { name: /VAULT SEALED UNTIL PART/ }),
      ).toBeVisible();
  }
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
