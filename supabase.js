// MYT — Supabase client init.
// The anon key is intended to be public (it's an end-user key gated by RLS),
// so inlining it in the browser bundle is fine. Phase 3 will add Auth + RLS.

(function () {
  const SUPABASE_URL = "https://aeugzumthwtuykonfyiz.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWd6dW10aHd0dXlrb25meWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDMyMzAsImV4cCI6MjA5Mjg3OTIzMH0.FV_81WsGjNpRUm5aVfCcH99IMfLpQsMwv-jIIKfj01M";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS UMD not loaded — check the <script> tag in index.html");
    return;
  }

  window.MYT_supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
})();
