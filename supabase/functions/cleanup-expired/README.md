# cleanup-expired

Scheduled retention cleanup. Deletes analyses whose `expires_at` has passed,
together with their Storage objects.

Retention is 7 days, set by the `analyses.expires_at` default in
`supabase/schema/002_analyses_and_storage.sql`. This function does not decide
the retention period — it only acts on rows that have already expired.

## What it does

For each expired analysis, in this order:

1. Remove `original`, `heatmap` and `thumbnail` from the private `documents`
   bucket.
2. Only if that succeeds, delete the `analyses` row.

If Storage removal fails, the row is left in place so the next run retries it.
Deleting the row first would strand the files with nothing pointing at them.

A Storage object that is already gone counts as success, which is what makes
the function safe to run repeatedly.

One failing analysis does not stop the rest of the batch. Up to 100 analyses
are processed per run; any remainder is picked up by the next run.

## Security

- Uses `SUPABASE_SERVICE_ROLE_KEY`, which the Edge runtime injects
  automatically. The key is never committed, never sent to the browser and
  never logged.
- Invocation requires the service role. An ordinary signed-in user's JWT is a
  valid JWT and would satisfy the platform's own `verify_jwt` check, so the
  function additionally inspects the `role` claim and returns 403 otherwise.
- Logs contain only analysis ids, failure stages and counts — never paths,
  signed URLs, document contents, user identifiers or key material.

## Deploy

Either paste the contents of `index.ts` into a new function named
`cleanup-expired` in **Dashboard → Edge Functions**, or, with the Supabase
CLI:

```bash
supabase functions deploy cleanup-expired
```

No function secrets need to be configured: `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are provided by the runtime.

## Schedule

Daily is appropriate — retention is measured in days, and anything missed is
simply cleaned on the next run.

Preferred: **Dashboard → Integrations → Cron**, scheduling this function on a
daily cron expression (for example `0 3 * * *`). The dashboard handles
authenticating the call.

If that integration is not available on the project, scheduling can be done in
SQL instead with `pg_cron` and `pg_net`; see
`supabase/schema/003_retention_cron.sql`.

## Verifying

Invoking it returns a JSON summary and logs the same line:

```json
{ "scanned": 3, "deleted": 3, "failed": 0, "retried_next_run": 0,
  "batch_limit_reached": false }
```
