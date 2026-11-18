import { test, expect, type Page } from "@playwright/test";

async function request(page: Page, path: string, body?: unknown) {
  return page.evaluate(
    async ({ path, body }) => {
      const r = await fetch(path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        cache: "no-store",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      return { status: r.status, data: await r.json() };
    },
    { path, body },
  );
}
test("owner reviews are private, immediate, recoverable and preserve crew credits", async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name !== "phone-375",
    "Owner flow runs once against isolated preview data.",
  );
  test.skip(
    !process.env.OWNER_TEST_TOKEN || !process.env.OWNER_TEST_PASSWORD,
    "Private preview owner setup credentials required.",
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(20000);
  const base = process.env.BASE_URL!;
  expect(base).not.toMatch(
    /^https:\/\/(crimexhouse|crimex-house)\.vercel\.app\/?$/,
  );
  const errors: string[] = [];
  const analytics: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/insights")) analytics.push(r.url());
  });
  const memberContext = await browser.newContext({ baseURL: base });
  const member = await memberContext.newPage();
  const handle = `qa.owner.${Date.now().toString(36)}`;
  const password = `Private QA ${handle} password`;
  let created = false;
  try {
    await page.goto(`/owner#setup=${process.env.OWNER_TEST_TOKEN}`);
    await expect(
      page.getByRole("heading", { name: "Set up your owner access" }),
    ).toBeVisible();
    expect(page.url()).not.toContain("#");
    const initial = await request(page, "/api/owner");
    expect(initial.data.authenticated).toBe(false);
    expect(initial.data.members).toBeUndefined();
    expect(
      (
        await request(page, "/api/owner", {
          mode: "setup",
          token: "invalid",
          password,
        })
      ).status,
    ).toBe(403);
    await page
      .getByLabel("OWNER WEBSITE PASSWORD", { exact: true })
      .fill(process.env.OWNER_TEST_PASSWORD!);
    await page
      .getByRole("button", { name: "CREATE OWNER ACCESS", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Save your recovery code." }),
    ).toBeVisible();
    const recovery = await page
      .getByLabel("OWNER RECOVERY CODE", { exact: true })
      .inputValue();
    expect(recovery).toMatch(/^[a-f0-9]{40}$/);
    await page.getByLabel("I saved this recovery code privately.").check();
    await page.getByRole("button", { name: "CONTINUE TO DASHBOARD" }).click();
    await expect(page.getByText("Signed in as owner")).toBeVisible();
    expect(analytics).toEqual([]);
    const cookie = (await page.context().cookies()).find(
      (c) => c.name === "__Host-crimex_crew",
    );
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(
      (
        await request(page, "/api/crew/auth", {
          mode: "delete",
          password: process.env.OWNER_TEST_PASSWORD,
        })
      ).status,
    ).toBe(409);

    await member.goto("/missions");
    const joined = await request(member, "/api/crew/auth", {
      mode: "register",
      handle,
      password,
      publicRanking: true,
    });
    expect(joined.status).toBe(200);
    created = true;
    const code: string = joined.data.account.verificationCode;
    const createdAt = new Date().toISOString();
    expect(
      (
        await request(member, "/api/owner", {
          action: "approve",
          handle,
          code,
          createdAt,
          handleChecked: true,
          followerChecked: true,
        })
      ).status,
    ).toBe(403);
    const forbidden = await request(member, "/api/owner");
    expect(forbidden.data.authenticated).toBe(false);
    expect(forbidden.data.members).toBeUndefined();
    const puzzle = (await request(member, "/api/crew/challenge?mission=cipher"))
      .data;
    const [a, b, c] = puzzle.prompt.match(/\d+/g).map(Number);
    await member.waitForTimeout(1800);
    expect(
      (
        await request(member, "/api/crew/claim", {
          ticket: puzzle.ticket,
          answer: String(a * b + c).padStart(4, "0"),
        })
      ).data.account.balance,
    ).toBe(15);

    await page.getByRole("button", { name: "REFRESH", exact: true }).click();
    const card = page
      .locator(".owner-member")
      .filter({ hasText: `@${handle}` });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "VERIFY", exact: true }).click();
    const review = page.getByRole("dialog");
    await expect(review).toBeVisible();
    await expect(
      review.getByRole("button", { name: "APPROVE CREW MEMBER" }),
    ).toBeDisabled();
    await review
      .getByLabel("CREW CODE FROM THEIR INSTAGRAM DM", { exact: true })
      .fill("CREW-0000000000");
    await review
      .getByLabel(`The DM was sent by @${handle}.`, { exact: true })
      .check();
    await review
      .getByLabel("I checked that they follow @crimex.house.", { exact: true })
      .check();
    await review.getByRole("button", { name: "APPROVE CREW MEMBER" }).click();
    await expect(review.getByRole("alert")).toContainText("does not match");
    expect((await request(member, "/api/crew")).data.account.verified).toBe(
      false,
    );
    await review
      .getByLabel("CREW CODE FROM THEIR INSTAGRAM DM", { exact: true })
      .fill(code);
    await review.getByRole("button", { name: "APPROVE CREW MEMBER" }).click();
    await expect(review).not.toBeVisible();
    expect((await request(member, "/api/crew")).data.account).toMatchObject({
      verified: true,
      balance: 15,
    });
    expect(
      (await request(member, "/api/crew/leaderboard")).data.entries,
    ).toContainEqual({ rank: 1, handle: `@${handle}`, points: 15 });
    await page.getByLabel("STATUS", { exact: true }).selectOption("approved");
    await expect(card).toBeVisible();
    await expect(card).toContainText("15 credits");
    await card.getByRole("button", { name: "REVIEW", exact: true }).click();
    await review.getByRole("button", { name: "REVOKE APPROVAL" }).click();
    await expect(review).not.toBeVisible();
    expect((await request(member, "/api/crew")).data.account).toMatchObject({
      verified: false,
      balance: 15,
    });
    expect(
      (await request(member, "/api/crew/leaderboard")).data.entries.some(
        (e: { handle: string }) => e.handle === `@${handle}`,
      ),
    ).toBe(false);
    await page.getByLabel("STATUS", { exact: true }).selectOption("revoked");
    await expect(card).toBeVisible();
    const privateData = (await request(page, "/api/owner?status=all")).data;
    for (const key of [
      "passwordHash",
      "salt",
      "sessions",
      "verificationCode",
      "recoveryHash",
      "accessToken",
      "appSecret",
    ])
      expect(JSON.stringify(privateData)).not.toContain(`"${key}"`);
    await expect(
      page.getByText("Meta connection needed", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("owner-dashboard.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "SIGN OUT", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Owner sign in", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "USE A RECOVERY CODE" }).click();
    await page
      .getByLabel("OWNER WEBSITE PASSWORD", { exact: true })
      .fill(process.env.OWNER_TEST_PASSWORD!);
    await page
      .getByLabel("SAVED RECOVERY CODE", { exact: true })
      .fill(recovery);
    await page
      .getByRole("button", { name: "RECOVER OWNER ACCESS", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Save your recovery code." }),
    ).toBeVisible();
    await page.getByLabel("I saved this recovery code privately.").check();
    await page.getByRole("button", { name: "CONTINUE TO DASHBOARD" }).click();
    await expect(page.getByText("Signed in as owner")).toBeVisible();
    const crossOrigin = await page.evaluate(async () => {
      const r = await fetch("/api/owner", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      });
      return r.status;
    });
    expect(crossOrigin).toBe(415);
    expect(errors).toEqual([]);
  } finally {
    if (created)
      expect(
        (await request(member, "/api/crew/auth", { mode: "delete", password }))
          .status,
      ).toBe(200);
    await memberContext.close();
  }
});
