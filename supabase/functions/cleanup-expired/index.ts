/**
 * Scheduled retention cleanup — deletes analyses whose 7-day retention
 * window has elapsed, together with their stored documents.
 *
 * Runs as a Supabase Edge Function with the service-role key, which the Edge
 * runtime injects automatically (SUPABASE_SERVICE_ROLE_KEY). The key is never
 * stored in this repository, never sent to the browser, and never logged.
 *
 * Ordering guarantee: Storage objects are removed BEFORE the database row.
 * If Storage removal fails, the row is deliberately left in place so the next
 * scheduled run retries it. Deleting the row first would strand the files with
 * nothing left pointing at them.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "documents";

/** Processed per run, to keep well inside the function execution limit.
 *  Anything left over is picked up by the next scheduled run. */
const BATCH_SIZE = 100;

interface ExpiredAnalysis {
  id: string;
  original_path: string | null;
  heatmap_path: string | null;
  thumbnail_path: string | null;
}

function isAuthorized(req: Request, serviceRoleKey: string): boolean {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  // Presenting the service-role key itself is sufficient, and works whatever
  // key format the project uses.
  if (token === serviceRoleKey) return true;

  // Otherwise accept only a token whose role claim is service_role. An
  // ordinary signed-in user's JWT is a valid JWT and would pass the
  // platform's own verify_jwt check, so the role must be inspected here or
  // any authenticated user could trigger a privileged cleanup.
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("cleanup-expired: function environment is not configured");
    return Response.json({ error: "not_configured" }, { status: 500 });
  }

  if (!isAuthorized(req, serviceRoleKey)) {
    // Deliberately terse: no hint about what a valid caller looks like.
    console.warn("cleanup-expired: rejected unauthorized invocation");
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Single timestamp for the whole run, so the set of rows considered expired
  // cannot drift between the query and the deletes.
  const cutoff = new Date().toISOString();

  const { data, error: selectError } = await supabase
    .from("analyses")
    .select("id, original_path, heatmap_path, thumbnail_path")
    .lte("expires_at", cutoff)
    .limit(BATCH_SIZE);

  if (selectError) {
    console.error("cleanup-expired: could not list expired analyses:", selectError.message);
    return Response.json({ error: "select_failed" }, { status: 500 });
  }

  const expired = (data ?? []) as ExpiredAnalysis[];
  let deleted = 0;
  let failed = 0;
  const failures: { id: string; stage: string }[] = [];

  for (const analysis of expired) {
    try {
      const paths = [analysis.original_path, analysis.heatmap_path, analysis.thumbnail_path]
        .filter((p): p is string => Boolean(p));

      // --- Storage first. -------------------------------------------------
      // remove() reports success for paths that are already gone, so an
      // object deleted earlier (or by a previous partial run) does not block
      // cleanup — which is what makes this safe to re-run.
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
        if (storageError) {
          // Leave the row alone; the next run retries this analysis.
          throw Object.assign(new Error(storageError.message), { stage: "storage" });
        }
      }

      // --- Database row second, and only now. -----------------------------
      // The expires_at predicate is repeated here as a second line of
      // defence: even if the selected set were somehow stale, a row whose
      // retention window has not elapsed cannot be removed.
      const { error: rowError } = await supabase
        .from("analyses")
        .delete()
        .eq("id", analysis.id)
        .lte("expires_at", cutoff);

      if (rowError) {
        throw Object.assign(new Error(rowError.message), { stage: "database" });
      }

      deleted += 1;
    } catch (err) {
      // One failing analysis must not stop the rest of the batch.
      failed += 1;
      const stage = (err as { stage?: string }).stage ?? "unknown";
      failures.push({ id: analysis.id, stage });
      // Log the analysis id and the stage only — never paths, signed URLs,
      // document contents, user identifiers or key material.
      console.error(`cleanup-expired: retaining ${analysis.id} after ${stage} failure`);
    }
  }

  const summary = {
    scanned: expired.length,
    deleted,
    failed,
    retried_next_run: failures.length,
    batch_limit_reached: expired.length === BATCH_SIZE,
  };
  console.log("cleanup-expired:", JSON.stringify(summary));

  return Response.json(summary, { status: 200 });
});
