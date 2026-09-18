/**
 * Supabase browser client.
 *
 * Only the publishable (anon) key belongs here — it is designed to be shipped
 * to browsers, and Row Level Security is what actually protects data. A
 * service-role/secret key must NEVER appear in this file or in any VITE_
 * variable, because everything in a VITE_ variable is compiled into the
 * public bundle.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local (see .env.example).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Version string recorded with a user's retention consent, so the exact
 *  wording they agreed to stays identifiable if the text later changes. */
export const RETENTION_CONSENT_VERSION = "v1-7day";
export const RETENTION_DAYS = 7;
export const RETENTION_CONSENT_TEXT =
  "I understand that uploaded documents and analysis results may be securely " +
  "stored for up to 7 days before automatic deletion.";
