import { test, expect } from "@playwright/test";
import crew from "../../data/crew.json";

test("daily missions save real credits, reject duplicate claims, and recover an account", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "phone-375",
    "The account lifecycle runs once; responsive route checks cover all sizes.",
  );
  test.setTimeout(180000);
  const handle = `qa.${Date.now().toString(36)}`;
  let password = `Crew-only ${handle} password`;
  let created = false;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/missions");
  async function request(path: string, body?: unknown) {
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
  try {
    await expect(
      page.getByRole("button", { name: "CREATE CREW ACCOUNT" }),
    ).toBeEnabled({ timeout: 30000 });
    await page.getByLabel("INSTAGRAM HANDLE", { exact: true }).fill(handle);
    await page.getByLabel("WEBSITE PASSWORD", { exact: true }).fill(password);
    await page.getByRole("button", { name: "CREATE CREW ACCOUNT" }).click();
    await expect(page.locator(".crew-account-line")).toContainText(
      `@${handle}`,
      { timeout: 30000 },
    );
    created = true;
    const recovery = await page
      .getByLabel("Account recovery code", { exact: true })
      .inputValue();
    expect(recovery).toMatch(/^[a-f0-9]{40}$/);
    expect(
      (await page.context().cookies()).find((c) =>
        c.name.includes("crimex_crew"),
      )?.httpOnly,
    ).toBe(true);
    await page.getByLabel("I saved my recovery code.").check();
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await expect(page.locator(".crew-account-line")).toContainText(
      "VERIFICATION PENDING",
    );
    await expect(page.locator(".wallet-number")).toContainText("0");

    const cipherResponse = page.waitForResponse((r) =>
      r.url().includes("/api/crew/challenge?mission=cipher"),
    );
    await page
      .locator(".daily-mission")
      .filter({ hasText: "Crack the daily cipher" })
      .getByRole("button")
      .click();
    const cipher = await (await cipherResponse).json();
    const [a, b, c] = cipher.prompt.match(/\d+/g).map(Number);
    const answer = String(a * b + c).padStart(4, "0");
    await page.getByLabel("FOUR-DIGIT COMBINATION").fill(answer);
    await page.waitForTimeout(1700);
    await page.getByRole("button", { name: "SUBMIT COMBINATION" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 30000 });
    await expect(page.locator(".wallet-number")).toContainText("15");
    const replay = await request("/api/crew/claim", {
      ticket: cipher.ticket,
      answer,
      credits: 999999,
    });
    expect(replay.status).toBe(200);
    expect(replay.data.account.balance).toBe(15);

    const briefingResponse = page.waitForResponse((r) =>
      r.url().includes("/api/crew/challenge?mission=briefing"),
    );
    await page
      .locator(".daily-mission")
      .filter({ hasText: "Read the room" })
      .getByRole("button")
      .click();
    const briefing = await (await briefingResponse).json();
    const correct = crew.briefings.find((q) => q.scene === briefing.prompt)!;
    await page
      .getByRole("radio", { name: correct.choices[correct.answer] })
      .check();
    await page.waitForTimeout(1700);
    await page.getByRole("button", { name: "FILE YOUR ANSWER" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 30000 });
    await expect(page.locator(".wallet-number")).toContainText("25");

    const memoryResponse = page.waitForResponse((r) =>
      r.url().includes("/api/crew/challenge?mission=memory"),
    );
    await page
      .locator(".daily-mission")
      .filter({ hasText: "Recover the evidence" })
      .getByRole("button")
      .click();
    const memory = await (await memoryResponse).json();
    const started = Date.now();
    const deck: string[] = memory.deck;
    for (const symbol of new Set(deck)) {
      for (let i = 0; i < deck.length; i++)
        if (deck[i] === symbol)
          await page
            .getByRole("button", {
              name: `Reveal evidence ${i + 1}`,
              exact: true,
            })
            .click();
    }
    await page.waitForTimeout(Math.max(0, 10500 - (Date.now() - started)));
    await page.getByRole("button", { name: "CLAIM DAILY CREDITS" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 30000 });
    await expect(page.locator(".wallet-number")).toContainText("50");
    await expect(page.locator(".daily-mission .button")).toHaveText([
      /COMPLETE/,
      /COMPLETE/,
      /COMPLETE/,
    ]);
    expect(
      (await request("/api/crew/redeem", { rewardId: crew.reward.id })).status,
    ).toBe(403);
    const standings = await request("/api/crew/leaderboard");
    expect(standings.status).toBe(200);
    expect(
      standings.data.entries.some(
        (e: { handle: string }) => e.handle === `@${handle}`,
      ),
    ).toBe(false);
    await page.reload();
    await expect(page.locator(".wallet-number")).toContainText("50", {
      timeout: 30000,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("crew-wallet.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "SIGN OUT", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "CREATE CREW ACCOUNT" }),
    ).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "USE A RECOVERY CODE" }).click();
    await page.getByLabel("INSTAGRAM HANDLE", { exact: true }).fill(handle);
    const replacement = `${password} renewed`;
    await page.getByLabel("NEW WEBSITE PASSWORD").fill(replacement);
    await page
      .getByLabel("SAVED RECOVERY CODE", { exact: true })
      .fill(recovery);
    await page
      .getByRole("button", { name: "RECOVER ACCOUNT", exact: true })
      .click();
    await expect(page.locator(".crew-account-line")).toContainText(
      `@${handle}`,
      { timeout: 30000 },
    );
    password = replacement;
    await expect(page.locator(".wallet-number")).toContainText("50");
    expect(errors).toEqual([]);
  } finally {
    if (created) {
      const result = await request("/api/crew/auth", {
        mode: "delete",
        password,
      });
      expect(
        result.status,
        "The private QA account is removed after the test",
      ).toBe(200);
    }
  }
});
