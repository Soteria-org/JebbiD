/**
 * scripts/bootstrap-super-admin.js
 * ----------------------------------------------------------------
 * Creates the FIRST super_admin account. Run this exactly once, per environment
 * (once for your dev/staging project, once for production when that exists).
 *
 * WHY THIS SCRIPT EXISTS: createStaffOrInvestorAccount (the normal way to create
 * staff accounts) requires the caller to already BE a super_admin. The very first
 * one can't come from inside the app — something has to create it. This script is
 * that "something," run directly against Supabase using the service-role key,
 * which never goes near the browser or any Server Action.
 *
 * USAGE:
 *   node scripts/bootstrap-super-admin.js "Jane Doe" jane@jebbidox.site
 *
 * You will be shown a temporary password ONCE. Log in with it immediately and you
 * will be forced to change it (must_change_password is set to true, same as any
 * other admin-created account).
 *
 * REQUIRES: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * already filled in (the real service role key, from Supabase Dashboard -> Project
 * Settings -> API). Do not run this with the publishable key — it will fail, by
 * design, since creating another user's auth.users row requires admin privileges.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const [, , fullName, email] = process.argv;

if (!fullName || !email) {
  console.error("Usage: node scripts/bootstrap-super-admin.js \"Full Name\" email@example.com");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

function randomTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin.from("profiles").select("id").eq("role", "super_admin").limit(1);
  if (existing && existing.length > 0) {
    console.error(
      "A super_admin already exists. This script is meant to run once. If you really need another one, use createStaffOrInvestorAccount from inside the app (logged in as an existing super_admin) instead of this script."
    );
    process.exit(1);
  }

  const tempPassword = randomTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError) {
    console.error("Failed to create auth user:", createError.message);
    process.exit(1);
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role: "super_admin",
    full_name: fullName,
    email,
    must_change_password: true,
    account_status: "invited",
  });
  if (profileError) {
    console.error("Auth user was created, but the profile insert failed:", profileError.message);
    console.error("You'll need to either fix and retry manually, or delete the orphaned auth user from the Supabase dashboard and re-run this script.");
    process.exit(1);
  }

  console.log("\nSuper admin created.");
  console.log("Email:   ", email);
  console.log("Password:", tempPassword, " <- shown once, not stored anywhere. Copy it now.");
  console.log("\nThis account must change its password on first login.\n");
}

main();
