import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://aeugzumthwtuykonfyiz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWd6dW10aHd0dXlrb25meWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDMyMzAsImV4cCI6MjA5Mjg3OTIzMH0.FV_81WsGjNpRUm5aVfCcH99IMfLpQsMwv-jIIKfj01M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});
