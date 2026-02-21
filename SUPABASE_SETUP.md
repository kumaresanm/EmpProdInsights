# Supabase setup (database + auth)

Use this when you want **persistent data** and **login/signup** instead of file-based storage and no auth.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name (e.g. `emp-prod`), database password, region.
3. Wait for the project to be ready.

## 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Copy the contents of **`supabase/schema.sql`** in this repo.
3. Paste into a new query and click **Run**.  
   This creates the `entries` and `config` tables and seeds `config` with `machines`, `employees`, `programs`.

## 3. Get your keys

In Supabase: **Project Settings** (gear) → **API**:

- **Project URL** → use as `SUPABASE_URL`
- **anon public** key → use as `SUPABASE_ANON_KEY` (for frontend auth)
- **service_role** key → use as `SUPABASE_SERVICE_ROLE_KEY` (for backend DB + JWT verification; keep secret)

## 4. Configure the backend

Set these **environment variables** (e.g. on Render: **Environment**):

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | Your Project URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

Redeploy the backend so it picks them up.

## 5. Enable email auth (optional)

In Supabase: **Authentication** → **Providers** → **Email**:

- Enable **Email** if you want email/password sign-in (default).
- For development you can disable **Confirm email** so sign-up works without verification.

## 6. Behaviour

- **When these env vars are set:**  
  - Data is read/written in Supabase (PostgreSQL).  
  - All `/api/*` routes (except `/api/health` and `/api/config`) require a valid Supabase JWT.  
  - The app shows **Sign in / Sign up** and **Sign out**.

- **When they are not set:**  
  - Data stays in `backend/data.json` (file-based).  
  - No auth; everyone can use the app.

## 7. First user

1. Open your app (e.g. the Render URL).
2. You should see the **Sign in** screen.
3. Use **“Need an account? Sign up”** and register with email + password.
4. After sign-up, you’re signed in and can use Dashboard, Entries, etc.

## 8. Migrating from file data

If you already have data in `data.json` and want it in Supabase:

1. Run the schema (step 2).
2. You can either:
   - Use **Import Excel** in the app to re-import your data after switching to Supabase, or  
   - Write a one-off script that reads `data.json` and inserts into Supabase `entries` and `config` via the Supabase client or SQL.
