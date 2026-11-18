# Owner dashboard and crew verification

Open **https://crimexhouse.vercel.app/owner**. This private page is excluded from
search indexing and page-view analytics. It is not linked in the public navigation.

## First visit

Use the private, one-time setup link supplied for this project. Its random token
is in the URL fragment, which the browser removes before continuing. Only its
SHA-256 hash is configured server-side in `CREW_OWNER_SETUP_TOKEN_HASH`.
Production and preview use different tokens.

Choose a separate website password for `@crimex.house`, or use the existing
website password if that account already exists. Save the recovery code
privately. Later visits use the normal owner sign-in form. The recovery form
rotates the password/recovery code and revokes earlier sessions while preserving
owner access.

Owner access is a private database grant bound to the account ID, creation time
and account verification code. Registering the same Instagram handle does not
grant this role. New public registrations reserve `@crimex.house` for the private
setup flow, preventing username squatting before owner activation. Existing
website accounts for that handle can still sign in and activate with the correct
password and setup link. Every owner API action checks the live session and grant on the
server. Setup cannot be repeated after the grant exists. Password-confirmed
deletion is blocked for the account holding owner access to prevent an accidental
lockout; an operator must remove or transfer its grant first.

## Approve a member

1. The person creates a free website account and DMs their `CREW-XXXXXXXXXX`
   code to `@crimex.house` from the same Instagram handle.
2. Check the actual DM sender and their follow on Instagram.
3. Find the handle under **Pending**, open **Verify**, paste the code from the
   DM, and confirm both checks. A mismatched code keeps the account pending.
4. Select **Approve crew member**. Approval is saved immediately in Neon;
   there is no Git edit or deployment.

The member sees the result when their wallet refreshes or they return to the
website. They may earn while pending. Redemption still requires enough credits;
weekly rankings still require public consent and positive earned points that
week. Wallet balances, award limits, reward prices and story release flags do
not change when approving someone. The owner account is omitted from the review
queue.

Use **Approved → Review → Revoke approval** if a member no longer qualifies.
Revocation removes current eligibility without deleting earned credits or
previous reward entitlements. The public leaderboard queries current database
eligibility, so it does not wait for an old cache to expire. Revoked members need
an owner review before a bot may approve them again.

The private directory is paginated and can be filtered by handle prefix or
status. Its responses include review status, dates, balance and ranking consent;
they exclude account hashes, passwords, sessions, recovery codes and CREW codes.
The code for approval must come from the Instagram DM. Each account retains its
last 20 approval/revocation events. Member deletion removes that account record.

## Connect the DM verification bot

The integration is implemented but starts disconnected and paused. A Creator
account is supported. Real Meta account authorization and a live DM test remain
necessary before claiming that Instagram delivery works end to end.

1. In [Meta for Developers](https://developers.facebook.com/), create an app
   with **Manage messaging & content on Instagram**. New apps use **API setup
   with Unified login** and need a business portfolio that you control. The
   portfolio must have access to the intended Instagram account.
2. Create a configuration from the Instagram template. It needs
   `instagram_basic` and `instagram_manage_messages`. Keep only the assets and
   permissions this verification integration needs where Meta permits editing.
   This app does not publish posts, manage comments or run ads.
3. For this owner-managed integration, use Meta's **Generate access tokens**
   section to add the real `@crimex.house` account as an Instagram Tester, accept
   its invitation, and generate the System-user access token (SUAT). Meta's
   dashboard shows it once. This is the dashboard-token workflow for the owner's
   own account; a public OAuth client-onboarding flow is not implemented.
4. In the website owner dashboard, choose **Connect your Meta app**, select
   **Unified Login (new Meta apps)**, and enter the Meta app secret and SUAT
   privately. The configuration ID can be saved optionally. Leave the Instagram
   account ID blank to discover it from the shared assets. Do not send secrets
   in chat or commit them to Git.
5. The server checks `graph.facebook.com/me?fields=client_business_id` and
   `/me/assigned_instagram_accounts?fields=id,username`. With a SUAT, `/me` is a
   system user, not the Instagram account. The site saves the client business ID
   and actual professional account ID only after finding `@crimex.house`.
6. Copy the webhook callback URL and verification token displayed in the owner
   dashboard into Meta's webhook configuration:
   `https://crimexhouse.vercel.app/api/instagram/webhook`.
7. Select the `messages` webhook field in Meta. After Meta verifies the callback,
   select **Enable automatic checks** on the site. It subscribes the professional
   account to message notifications and enables the bot only after Meta confirms
   success. Follow Meta's app-mode, access-level, business-verification and review
   requirements before using it with public members.
8. Test with a real member: register a website account, follow `@crimex.house`,
   and send a fresh DM with its CREW code from the matching Instagram handle.
   Confirm approval. Also test a non-follower, wrong code, and a sender outside
   the app's roles as Meta permits. Keep manual review available.

If Meta's **Publish** page asks for a privacy-policy URL, use
`https://crimexhouse.vercel.app/privacy` in **App settings → Basic**. The public
data-deletion instructions are at
`https://crimexhouse.vercel.app/data-deletion`; choose the **Data deletion
instructions URL** option if Meta asks for it, not an automatic callback. These
pages describe the implemented account and verification behavior, including
manual deletion help through the creator. A `DATA DELETION` DM is not an
automatic command. Complete the publishing and access requirements Meta actually
shows; successful callback verification and subscription alone do not prove that
real DMs are delivered in Development mode.

For an older Meta app that still offers **Instagram Login**, choose **Instagram
Login (older Meta apps)** in the owner form and supply its Instagram User access
token. That mode uses `graph.instagram.com`, `instagram_business_basic` and
`instagram_business_manage_messages`; the professional ID is the `user_id` from
`/me`. Existing encrypted connections without an API-mode field keep this legacy
behavior. Tokens from different login setups are not interchangeable.

Meta credentials are AES-256-GCM encrypted in the private database with a
namespace-bound key derived from the existing server signing secret. App secrets
and access tokens are never returned in dashboard responses after saving. Keep
the server signing secret stable; changing it requires re-encrypting or
reconnecting this integration. Renew or replace the token according to the selected Meta configuration.
Tokens may be revoked when portfolio assets or app access change. Saving new credentials pauses the bot until the owner enables
it again.

The webhook verifies the raw-body HMAC-SHA256 signature, the connected account
and recipient ID, and the event timestamp. It only processes DMs containing a
single distinct CREW code. It fetches the real sender's username and follower
status through Meta's User Profile API and compares the saved website code.
False or missing follower status, other handles, mismatched codes and owner
revocations never produce an approval. Transient provider/storage failures
return a retryable response; hashed message receipts deduplicate completed
deliveries. The bot does not award or spend credits.

Verification checks a follow when the DM is processed; continuous unfollow
monitoring is not implemented. A person who follows after an unsuccessful check
should send a fresh code DM. This version updates the website status and does
not send automatic Instagram replies. General DM text is not saved. Approved
accounts may retain the Instagram-scoped sender ID; receipts contain a hashed
message ID and processing time. Receipt cleanup is an operator maintenance task.

Official references:

- [Unified Login setup](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started)
- [Unified Login authentication](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication)

- [Instagram User Profile API](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile)
- [Instagram Webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks)
- [Webhook setup](https://developers.facebook.com/documentation/instagram-platform/webhooks/setup)

## Operator fallback

The owner dashboard is the normal workflow. The existing `crew:approve` script
now writes the same private database approval instead of editing public JSON.
An operator must explicitly provide the intended server-side `DATABASE_URL` and
`VERCEL_ENV` before running it. Keep production credentials outside the repo.
The script assumes the operator already checked the DM sender, code and follow.
It does not check Instagram itself. Historical `verifiedCrew` JSON approvals
remain compatible, while an account's explicit database approval/revocation
takes precedence.

Hosting remains Vercel Hobby and Neon Free. No paid bot provider or AI service is
installed. Provider usage limits and Meta permission requirements still apply.
