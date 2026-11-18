import { test, expect } from "@playwright/test";
import crew from "../../data/crew.json";

test("one crew handle, private drafts and manual verification work across pages", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name === "tablet-768",
    "Phone and desktop cover this journey.",
  );
  let signedIn = false;
  const handle = "@shared.crew";
  const wallet = () =>
    signedIn
      ? {
          handle,
          balance: 0,
          earned: 0,
          spent: 0,
          verificationCode: "CREW-0123456789",
          verified: false,
          publicRanking: false,
          weeklyPoints: 0,
          rewards: [],
          transactions: [],
          missions: crew.missions.map((m) => ({
            ...m,
            completed: false,
            attemptsLeft: 5,
          })),
        }
      : null;
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (req) => {
    if (req.method() === "POST") writes.push(req.postData() ?? "");
  });
  await context.route("**/api/crew/identity", (route) =>
    route.fulfill({
      json: { account: signedIn ? { handle, verified: false } : null },
    }),
  );
  await context.route("**/api/crew", (route) =>
    route.fulfill({
      json: {
        configured: true,
        account: wallet(),
        day: "2026-11-18",
        week: "2026-11-16",
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        reward: crew.reward,
      },
    }),
  );
  await context.route("**/api/crew/leaderboard", (route) =>
    route.fulfill({
      json: { entries: [], week: "2026-11-16", nextWeek: "2026-11-23" },
    }),
  );
  await context.route("**/api/crew/auth", async (route) => {
    const body = route.request().postDataJSON();
    signedIn = body.mode !== "logout";
    await route.fulfill({ json: { account: wallet() } });
  });
  await context.route("**/_vercel/insights/script.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "void 0;" }),
  );
  await page.addInitScript(() =>
    localStorage.setItem("crimex:safe:s1-p1", '["1150"]'),
  );
  await page.goto("/board");
  await page.getByLabel("YOUR INSTAGRAM HANDLE").fill("guest.pin");
  await page.getByLabel("YOUR CASE THEORY").fill("A private guest theory");
  await page.getByRole("button", { name: "SAVE MY FREE CREW PIN" }).click();
  await page.goto("/missions");
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  await page.getByLabel("INSTAGRAM HANDLE", { exact: true }).fill(handle);
  await page
    .getByLabel("WEBSITE PASSWORD", { exact: true })
    .fill("Test-only website password");
  await page
    .locator(".crew-account-panel form")
    .getByRole("button", { name: /SIGN IN/ })
    .click();
  await expect(page.locator(".crew-account-line")).toContainText(handle);
  await expect(
    page.getByRole("heading", { name: "Waiting for creator approval." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "OPEN INSTAGRAM DM" }),
  ).toHaveAttribute("href", "https://ig.me/m/crimex.house");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
    }),
  );
  await page.getByRole("button", { name: "COPY CREW CODE" }).click();
  await expect(
    page.getByText("Crew code copied. Paste it into your Instagram DM."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe("CREW-0123456789");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Permission denied");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "COPY CREW CODE" }).click();
  await expect(
    page.getByText(
      "Copy the selected code, then paste it into your Instagram DM.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Instagram verification code")).toBeFocused();
  expect(
    await page.getByLabel("Instagram verification code").evaluate((element) => {
      const input = element as HTMLInputElement;
      return input.selectionEnd! - input.selectionStart!;
    }),
  ).toBe("CREW-0123456789".length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.locator(".crew-verification").screenshot({
    path: info.outputPath("manual-verification.png"),
  });
  const otherTab = await context.newPage();
  await otherTab.goto("/board");
  await expect(otherTab.getByLabel("YOUR INSTAGRAM HANDLE")).toHaveValue(
    "shared.crew",
  );
  await page.goto("/board");
  await expect(page.getByLabel("YOUR INSTAGRAM HANDLE")).toHaveValue(
    "shared.crew",
  );
  await expect(page.getByLabel("YOUR INSTAGRAM HANDLE")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByLabel("YOUR CASE THEORY")).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByLabel("YOUR CASE THEORY").fill("A private account theory");
  await page.getByRole("button", { name: "SAVE MY FREE CREW PIN" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("YOUR CASE THEORY")).toHaveValue(
    "A private account theory",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("crimex:crew:draft:@shared.crew")!)
          .theory,
    ),
  ).toBe("A private account theory");
  await page.goto("/safe");
  await expect(page.getByLabel("YOUR INSTAGRAM HANDLE")).toHaveValue(handle);
  await expect(page.getByLabel("YOUR INSTAGRAM HANDLE")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "LOG COMPLETION" }).click();
  await expect(page.locator(".completion-confirmation")).toContainText(handle);
  await expect(page.locator(".completion-confirmation")).toContainText(
    "Crew verification is separate",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.goto("/missions");
  await page.getByRole("button", { name: /SIGN OUT/ }).click();
  await expect(
    otherTab.getByLabel("YOUR INSTAGRAM HANDLE"),
  ).not.toHaveAttribute("readonly", "");
  await expect(otherTab.getByLabel("YOUR CASE THEORY")).toHaveValue(
    "A private guest theory",
  );
  await otherTab.close();
  await page.goto("/board");
  await expect(page.getByLabel("YOUR INSTAGRAM HANDLE")).not.toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByLabel("YOUR CASE THEORY")).toHaveValue(
    "A private guest theory",
  );
  expect(
    writes.some(
      (body) =>
        body.includes("private guest theory") ||
        body.includes("private account theory"),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("guest board and vault remain usable when account lookup is unavailable", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "phone-375",
    "The failure mode is independent of viewport.",
  );
  let stalled = false;
  await context.route("**/api/crew/identity", async (route) => {
    if (!stalled)
      await route.fulfill({
        status: 503,
        json: { error: "Temporarily unavailable" },
      });
    // A subsequent request hangs until the client's six-second timeout.
  });
  await page.addInitScript(() =>
    localStorage.setItem("crimex:safe:s1-p1", '["1150"]'),
  );
  await page.goto("/board");
  await page.getByLabel("YOUR INSTAGRAM HANDLE").fill("guest.offline");
  await page.getByLabel("YOUR CASE THEORY").fill("A local guest draft");
  await page.getByRole("button", { name: "SAVE MY FREE CREW PIN" }).click();
  await expect(
    page.getByText("Your free crew pin and theory are saved on this device."),
  ).toBeVisible();
  stalled = true;
  await page.goto("/safe");
  await page.getByLabel("YOUR INSTAGRAM HANDLE").fill("guest.offline");
  await page.getByRole("button", { name: "LOG COMPLETION" }).click();
  await expect(page.locator(".completion-confirmation")).toContainText(
    "@guest.offline",
  );
});

test("public links include the branded cover and page-specific sharing titles", async ({
  page,
  request,
}, info) => {
  test.skip(
    info.project.name !== "phone-375",
    "Metadata is independent of viewport.",
  );
  for (const [path, title] of [
    ["/", "CRIMEX HOUSE"],
    ["/missions", "Daily Missions"],
    ["/board", "Persons of Interest"],
    ["/safe", "Crack the Safe"],
  ]) {
    await page.goto(path);
    await expect(
      page.locator('meta[property="og:image"]').first(),
    ).toHaveAttribute("content", /opengraph-image/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      new RegExp(title),
    );
    await expect(
      page.locator('meta[name="twitter:image"]').first(),
    ).toHaveAttribute("content", /opengraph-image/);
  }
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const bytes = await image.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
});
