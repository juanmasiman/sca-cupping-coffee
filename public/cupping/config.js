/* ============================================================
   Deployment configuration

   Read by app.js at startup. The anon key is designed to be public
   — it identifies the project, and row-level security is what keeps
   one cupper's history private from another. Never put a
   service_role key here: that one bypasses every policy.

   Leave these blank to run the app device-only, with no sign-in
   and no cloud sync.
   ============================================================ */

// Length of the emailed sign-in code, matching Supabase → Authentication
// → Providers → Email → Email OTP Length. The keypad accepts longer codes
// regardless, so a mismatch is inconvenient rather than broken.
window.OTP_LENGTH = 8;

window.SUPABASE_URL = 'https://albzajlwlotjnexymazb.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsYnphamx3bG90am5leHltYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTc4MDUsImV4cCI6MjEwMjkzMzgwNX0.jpgFZPfQb4ZYJGO2wtSQEE6BBpely7uoRCGVoUqsCeo';
