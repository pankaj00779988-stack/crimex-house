# Crew storage operations

The existing Crew account model runs on Neon Postgres. `crimex_crew_records`
stores one private JSONB document per account or rate-limit bucket. SQL updates
compare a UUID revision; every successful change gets a new revision. A stale
request cannot overwrite a newer award, redemption, recovery or deletion.
Balance, claims, ledger and reward entitlements change together in that account
record. Database credentials are server-only; there is no browser SQL endpoint.

Owner access, dynamic approval/revocation and encrypted Instagram connection
records also live in this private store. Account verification fields are
optional, so existing account records remain compatible. The account-handle
partial index supports the owner directory. See [OWNER_GUIDE.md](OWNER_GUIDE.md)
for owner setup and Meta connection requirements. Backups of the namespace must
include these records as well as accounts and rate-limit buckets; retain the
server signing secret to decrypt the Instagram connection.

## Environments

The existing Vercel project is `crimexhouse/crimex-house`.

| Vercel environment | Neon Free resource | Record namespace |
| --- | --- | --- |
| Production | `crimex-crew-production` | `crew-v1` |
| Preview | `crimex-crew-preview` | `crew-preview-v1` |
| Development/local | `crimex-crew-preview` | `crew-development-v1` |

Both resources are in `iad1`. Preview and development share a resource but use
different namespaces; they cannot see production through their database URL.

Required server-side variables:

- `DATABASE_URL`, provisioned by the Neon Marketplace integration.
- `CREW_STORAGE_BACKEND=postgres`, selected explicitly after migration.
- `CREW_SIGNING_SECRET`, retained from the legacy signing derivation so existing
  challenge signatures and rate-limit bucket identities remain valid.

The legacy derivation is HMAC-SHA256 with `BLOB_READ_WRITE_TOKEN` as key and
`crimex-crew-signing-v1` as message, encoded in hex. Do not rotate it as part of a
storage move. `BLOB_READ_WRITE_TOKEN` remains connected for backup access; normal
Postgres wallet requests do not use Blob. Never put credentials in public
variables, client code, logs or Git. `.env*` is excluded from Git and deployment
uploads. Keep any production environment file outside the repository, so local
Next.js builds cannot accidentally prefer it over development settings.

The old Blob adapter remains available only for deliberate operations. There is
no automatic fallback when Postgres fails. After the verified cutover, an unset backend defaults to Postgres as well, so
removing a configuration variable cannot accidentally revive old Blob wallets.
Keep `CREW_STORAGE_BACKEND=postgres` explicit in the project. Selecting `blob`
is a deliberate operator override and requires reconciliation after any
Postgres writes.

## Initialize and verify

Pull development variables into an ignored `.env.local` after linking the
existing project. Initialize the database before serving account traffic:

```bash
node --env-file=.env.local --import tsx scripts/crew-storage.ts prepare crew-development-v1
CREW_DATABASE_TEST=1 node --env-file=.env.local --import tsx --test tests/postgres.integration.ts
```

The integration test uses a random QA namespace, deletes its records in a
`finally` block, and refuses `VERCEL_ENV=production`. Supply only development
credentials. Environments that require an HTTP proxy may need
`NODE_USE_ENV_PROXY=1` for Node's fetch implementation.

The existing browser account test creates a private, unverified account, earns
all three mission awards, checks replay protection, reloads the balance,
recovers credentials and deletes the account. Run it on a preview first.

## Migration and recovery

The migration utility supports `prepare`, `snapshot`, `import`, `verify` and
`audit`. Always pass an explicit namespace. `snapshot` reads the entire legacy
namespace twice and refuses a changing source. It uses the Blob adapter's
consistent origin reads and writes a private, exclusive backup file outside
the repository. Its reports contain counts and canonical SHA-256 checksums,
never handles, credentials or account bodies.

For a live migration:

1. Deploy with `CREW_MIGRATING=1` to pause account POSTs while keeping public
   story pages available. Verify the pause on every public alias. Let in-flight
   writes finish before taking the final snapshot.
2. Take a fresh private snapshot with the legacy credentials. Keep it outside
   the repository with directory mode `0700` and file mode `0600`.
3. Initialize the target schema. Import the snapshot with the target database
   credentials. Import inserts missing records and refuses different or extra
   target records; it never overwrites a newer wallet. It is safe to retry an
   interrupted import while the target is inactive.
4. Run `verify` to compare every key and canonical JSON value, and compare a
   fresh source snapshot again before cutover. Keep the source backup.
5. Set `CREW_STORAGE_BACKEND=postgres`, remove the maintenance flag, and deploy.
   Verify the live account lifecycle and confirm new writes reach Postgres.

Example shapes, with private paths and the correct environment file supplied
by the operator:

```bash
node --env-file=/private/source.env --import tsx scripts/crew-storage.ts snapshot crew-v1 /private/crew-snapshot.json
node --env-file=/private/target.env --import tsx scripts/crew-storage.ts import crew-v1 /private/crew-snapshot.json
node --env-file=/private/target.env --import tsx scripts/crew-storage.ts verify crew-v1 /private/crew-snapshot.json
node --env-file=/private/target.env --import tsx scripts/crew-storage.ts audit crew-v1
```

After Postgres accepts live writes, switching to an old Blob deployment would
show outdated balances. If recovery is needed, pause writes, preserve the new
database state and reconcile it before changing backends. Prefer deploying a
fix against the current database. Do not delete the old Blob records until a
separate retention decision is made.

Hosting remains Vercel Hobby and the database plan is Neon Free. No paid
subscription was selected. Free quotas are finite and do not imply a fixed
visitor capacity; monitor database compute/storage and Vercel function,
bandwidth and image usage. The free resource selected at setup has 1 GB and
100 compute-unit hours per project. Large campaigns need a measured load test
and a fresh quota review; the functional concurrency tests are not a capacity
benchmark. Provider idle wake-up can add latency to the first request.
