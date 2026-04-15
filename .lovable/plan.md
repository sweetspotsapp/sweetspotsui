

# Revised Plan: Fully Automated Migration via Edge Functions

## What You Provide (4 secrets)

1. `MIGRATION_TARGET_URL` — e.g. `https://xxxxx.supabase.co`
2. `MIGRATION_TARGET_SECRET_KEY` — the `sb_secret_...` key
3. `MIGRATION_EXPORT_TOKEN` — random string you choose
4. `MIGRATION_TARGET_DB_URL` — direct Postgres connection string (found in Settings → Database → Connection string → URI). Needed to run SQL migrations.

The DB URL is required because the Supabase JS client can't execute raw SQL — we need a direct Postgres connection to create tables, enums, RLS policies, functions, and triggers.

## What Gets Fully Automated

| Step | How |
|------|-----|
| **Schema** (tables, RLS, functions, enums, triggers) | Edge function reads all 37 migration files, executes SQL via Postgres connection to target DB |
| **Storage buckets** | Edge function creates `place-photos`, `avatars`, `sweetspots`, `trip-documents` via target service role client |
| **Table data** (14 tables) | Edge function reads from source, upserts to target via service role client |
| **Auth users** | Edge function reads via source admin API, creates on target via `admin.createUser()` |
| **Storage files** | Edge function downloads from source, uploads to target (paginated) |

## Edge Functions to Create

### 1. `migrate-schema/index.ts`
- Connects to target DB using `MIGRATION_TARGET_DB_URL` via Deno Postgres driver
- Reads and executes all migration SQL files embedded in the function
- Creates storage buckets via target Supabase client
- Returns: list of migrations applied + buckets created

### 2. `migrate-data/index.ts`
- Reads all 14 tables from source using source service role key
- Upserts into target via target service role client
- Large tables (places ~18k rows) chunked in batches of 500
- Safely re-runnable

### 3. `migrate-users/index.ts`
- Lists `auth.users` from source via admin API
- Creates each on target via `admin.createUser()` with metadata
- Password hashes won't transfer — users need password reset on first login

### 4. `migrate-storage/index.ts`
- Downloads files from all 4 buckets on source
- Uploads to matching buckets on target
- Paginated with `bucket`, `offset`, `limit` params for timeout handling

## Execution Order

```bash
# 1. Schema + buckets first
curl -X POST ".../migrate-schema" -d '{"export_token":"YOUR_TOKEN"}'

# 2. Data
curl -X POST ".../migrate-data" -d '{"export_token":"YOUR_TOKEN"}'

# 3. Users
curl -X POST ".../migrate-users" -d '{"export_token":"YOUR_TOKEN"}'

# 4. Storage (may need multiple calls)
curl -X POST ".../migrate-storage" -d '{"export_token":"YOUR_TOKEN","bucket":"place-photos","offset":0,"limit":50}'
```

## After Migration
- Set API secrets on new project (Google Maps, Stripe, etc.)
- Deploy edge functions: `supabase functions deploy`
- Update frontend `.env` with new URL and anon key
- Delete the 4 temporary migration edge functions

## Technical Notes
- The migration SQL will be embedded directly in the `migrate-schema` function (concatenated from all files in `supabase/migrations/`)
- Deno's `postgres` module (`deno.land/x/postgres`) handles the direct DB connection
- All functions verify `export_token` before proceeding

