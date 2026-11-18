import { normalizeHandle, validHandle } from "../game";
import { CrewError, isVerified, type Account } from "./model";
import { accountId } from "./service";
import { privateStore, updateAccount, type CrewStore } from "./store";

export function cleanCrewHandle(value: unknown) {
  if (typeof value !== "string" || !validHandle(value))
    throw new CrewError("Enter a valid Instagram handle.");
  return normalizeHandle(value).toLowerCase();
}
export async function reviewCrew(
  input: Record<string, unknown>,
  method: "owner" | "instagram",
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const handle = cleanCrewHandle(input.handle);
  const approve = input.action === "approve";
  if (!approve && input.action !== "revoke")
    throw new CrewError("Choose approve or revoke.");
  const code =
    typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  if (approve && !/^CREW-[A-F0-9]{10}$/.test(code))
    throw new CrewError("Paste the CREW code from the Instagram DM.");
  if (
    method === "owner" &&
    approve &&
    (input.handleChecked !== true || input.followerChecked !== true)
  )
    throw new CrewError(
      "Confirm that the DM handle matches and that this account follows @crimex.house.",
    );
  return updateAccount(store, accountId(handle), (a) => {
    if (
      a.handle !== handle ||
      (method === "owner" && input.createdAt !== a.createdAt)
    )
      throw new CrewError(
        "This account changed. Refresh the list before reviewing it.",
        409,
      );
    if (approve && a.verificationCode !== code)
      throw new CrewError(
        "That CREW code does not match this website account. Check the Instagram DM.",
        409,
      );
    if (method === "instagram" && a.verification?.status === "revoked")
      throw new CrewError("This member needs owner review.", 409);
    const status = approve ? "approved" : "revoked";
    if (
      a.verification?.status !== status ||
      a.verification.code !== a.verificationCode
    ) {
      const event = { status, at: now.toISOString(), method } as const;
      a.verification = {
        ...event,
        code: a.verificationCode,
        ...(method === "instagram" && typeof input.instagramId === "string"
          ? { instagramId: input.instagramId }
          : {}),
        history: [...(a.verification?.history ?? []), event].slice(-20),
      };
    }
    return { handle: a.handle, verified: isVerified(a), status };
  });
}
export function verificationStatus(a: Account) {
  return isVerified(a)
    ? "approved"
    : a.verification?.status === "revoked"
      ? "revoked"
      : "pending";
}
