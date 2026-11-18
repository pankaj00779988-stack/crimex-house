import { cleanCrewHandle, reviewCrew } from "../lib/crew/verification";
import { accountId } from "../lib/crew/service";
import { privateStore } from "../lib/crew/store";
import { CrewError, type Account } from "../lib/crew/model";

async function main() {
  const [handleInput, code, extra] = process.argv.slice(2);
  if (
    extra ||
    !handleInput ||
    (!/^CREW-[A-F0-9]{10}$/.test(code ?? "") && code !== "--revoke")
  )
    throw new CrewError(
      "After checking the Instagram DM and follow, use @handle CREW-XXXXXXXXXX or @handle --revoke. The private /owner dashboard is recommended.",
    );
  if (
    !process.env.DATABASE_URL ||
    !["production", "preview", "development"].includes(
      process.env.VERCEL_ENV ?? "",
    )
  )
    throw new CrewError(
      "Use the owner dashboard, or supply server-side DATABASE_URL and an explicit VERCEL_ENV for the intended database. Credentials must stay outside Git.",
    );
  const handle = cleanCrewHandle(handleInput);
  const account = (
    await privateStore.read<Account>(`accounts/${accountId(handle)}`)
  )?.value;
  if (!account)
    throw new CrewError("No website account exists for this handle.");
  const result = await reviewCrew(
    {
      action: code === "--revoke" ? "revoke" : "approve",
      handle,
      code,
      createdAt: account.createdAt,
      handleChecked: true,
      followerChecked: true,
    },
    "owner",
  );
  console.log(
    `${handle}: ${result.status}. Saved privately; no deployment is needed.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof CrewError
      ? error.message
      : "Crew approval failed. Check the intended database environment; private values were not logged.",
  );
  process.exitCode = 1;
});
