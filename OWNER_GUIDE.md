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

1. In [Meta for Developers](https://developers.facebook.com/), create/configure
   an app using **Instagram API with Instagram Login** for `@crimex.house`.
   Follow Meta's requirements for adding the professional account, app mode,
   access level, messaging access and any required review.
2. Obtain `instagram_business_basic` and
   `instagram_business_manage_messages` access. Use the Instagram User token
   for this API, not a token from a different login/API setup.
3. In the owner dashboard, choose **Connect your Meta app** and enter the
   app secret used to sign Instagram webhook notifications and the Instagram User
   access token. The professional account ID is detected from the token; the
   account ID field is optional. Enter these on
   the private site rather than in chat or Git. The server checks that the token
   resolves to `@crimex.house` before saving it. The connector uses Meta’s
   professional `user_id`, which can differ from the app-scoped `id`.
4. Copy the callback URL and verification token displayed in the dashboard into
   the app's Instagram webhook setup:
   `https://crimexhouse.vercel.app/api/instagram/webhook`.
5. Subscribe to `messages` and enable the subscription for the professional
   account. When Meta verifies the callback, the dashboard shows that status.
   Then select **Enable automatic checks**.
6. Test with a real member: register a website account, follow `@crimex.house`,
   and send a new DM containing its CREW code. Confirm the member becomes
   approved. Also test a non-follower, wrong code, and an account outside the
   app's test roles as permitted by Meta. Keep manual review available.

Meta credentials are AES-256-GCM encrypted in the private database with a
namespace-bound key derived from the existing server signing secret. App secrets
and access tokens are never returned in dashboard responses after saving. Keep
the server signing secret stable; changing it requires re-encrypting or
reconnecting this integration. Renew/replace the Instagram access token when
Meta requires it. Saving new credentials pauses the bot until the owner enables
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
