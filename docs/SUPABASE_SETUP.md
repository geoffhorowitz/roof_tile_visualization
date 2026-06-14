# Supabase Setup Guide

This guide provides instructions to set up and configure your Supabase backend for the Roof Tile Visualizer application. The Supabase integration handles user authentication, metadata storage for render history (`generations`), the tile catalog (`roof_tiles`), and secure cloud storage for uploaded original and generated house photos.

---

## 1. Project Creation
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project** and select your organization.
3. Configure the project details:
   - **Name**: e.g., `roof-tile-visualizer`
   - **Database Password**: Generate and securely store this password.
   - **Region**: Choose a region close to your local or deployment environment.
4. Click **Create new project** and wait for provisioning to complete.

---

## 2. Environment Variables
1. Locate your API credentials in the Supabase Dashboard:
   - Go to **Project Settings** (gear icon) -> **API**.
   - Copy the **Project URL** (under Project API keys).
   - Copy the **anon / public** key.
2. In the root of your Next.js project, create or open the `.env.local` file.
3. Add the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

---

## 3. Database Schema & Seed Data
Execute the primary database setup script to configure tables, triggers, and the initial tile catalog:
1. In the Supabase Dashboard, select the **SQL Editor** from the left navigation.
2. Click **New query** (or **New blank query**).
3. Open the file [supabase_schema.sql](file:///home/gh-wsl/github_repos/personal/roof_tile_visualizer/supabase_schema.sql) in your project workspace.
4. Copy its entire contents, paste it into the Supabase SQL Editor, and click **Run**.

This query automatically sets up:
* **`public.profiles`**: Stores user profiles synced from authentication metadata.
* **`public.roof_tiles`**: Houses the catalog of GAF, Owens Corning, and architectural tile options.
* **`public.generations`**: Logs user history, mapping the selected tiles and image storage URLs.
* Triggers and functions (`handle_new_user`) that auto-create user profile records upon email registration.
* Database-level Row Level Security (RLS) policies for secure data separation.
* Pre-seeded data populated with all 34 tiles cataloged in the visualizer.

---

## 4. Schema & Table Permissions
To ensure the Next.js backend and client-side modules can execute API operations correctly under standard database roles:
1. In the **SQL Editor**, click **New query**.
2. Copy, paste, and run the following permission grants script:
   ```sql
   -- Grant schema usage
   GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
   GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

   -- Grant public table privileges (RLS is enforced on top of these)
   GRANT SELECT ON public.roof_tiles TO anon, authenticated, service_role;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated, service_role;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO anon, authenticated, service_role;

   -- Grant storage schema privileges
   GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
   GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;

   -- Grant sequences usage
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
   ```

---

## 5. Storage Bucket Configuration
The application stores original uploaded house images and generated results inside a Supabase Storage bucket.
1. Navigate to the **Storage** section in your Supabase Dashboard.
2. Click **New bucket** and configure:
   - **Bucket Name**: `roof-visualizer`
   - **Public bucket**: **Enabled/ON** (Required to generate public asset URLs for front-end rendering).
3. Click **Save**.
4. The RLS policies created in step 3 (`supabase_schema.sql`) will automatically secure individual uploads, limiting modifications to authenticated owners inside user-scoped subfolders (`inputs/${user.id}/` and `outputs/${user.id}/`).

---

## 6. Authentication Settings
The application uses Supabase Auth's Email provider to sign in users.
1. Navigate to the **Authentication** section -> **Providers** -> **Email** in the Supabase Dashboard.
2. Ensure the **Email provider** is toggled **ON**.
3. **Optional for development:** Disable *Confirm email* to allow users to sign up and log in immediately without verifying email addresses.
4. Go to **Authentication** -> **URL Configuration** and update redirect settings:
   - **Site URL**: `http://localhost:3000` (or your production domain).
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`.

---

## 7. Verification & Testing
Two automated diagnostic scripts are included in the workspace tests folder to verify that your connection, tables, buckets, and user registrations are fully operational:

### A. General Supabase Connectivity
Run the main diagnostics script to confirm API access and verify the populated catalog:
```bash
npx tsx tests/diagnose_supabase.ts
```
* **Expected Output**:
  - `✓ Received buckets list from API.`
  - `✓ Table "roof_tiles" exists and has 34 rows.`

### B. User Profile Verification
To verify that registered user profiles have been correctly synced in the database:
```bash
npx tsx tests/check_profiles.ts
```
* **Expected Output**:
  - `✓ Successfully queried public.profiles.`
  - Returns the active count and details of verified logged-in users.
