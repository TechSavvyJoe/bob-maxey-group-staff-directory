# Bob Maxey Group Staff Directory — production admin and sync plan

The published directory is static GitHub Pages. The included **Admin** workspace is intentionally browser-local: it provides an operational UI for editing records, importing CSV, matching extensions, exporting changes, and reviewing sources. It is not an authentication boundary and it does not run scheduled jobs.

## What the production connector must provide

1. **Authentication and roles**
   - Put the admin app behind the dealership's existing identity provider or Cloudflare Access.
   - Roles: `viewer`, `editor`, `location-manager`, `group-admin`.
   - Never expose CallRevu credentials, API tokens, or staff-only notes in the public directory bundle.

2. **Staff data service**
   - Store a canonical employee record with: stable ID, name, location, department, title, direct phone, extension, work email, photo URL, sales track, active status, source, source URL, source last-seen date, manual override fields, and audit timestamps.
   - Preserve manual overrides during source refreshes; surface conflicts for review instead of overwriting them.
   - Publish only the permitted public fields to the public directory.

3. **Public website staff-page refresh**
   - A server-side job reads the four configured source pages: Howell, Fowlerville, Ford Detroit, and Lincoln.
   - Normalize names, title, email, direct number, department, and image URL; match to canonical records by stable source key plus normalized location/name.
   - Run daily or on demand, keep a run log, and flag additions/removals/field conflicts for an editor to approve.

4. **CallRevu extension refresh**
   - Use an approved CallRevu API or scheduled secure CSV export; do not rely on a browser session or store browser cookies in a repository.
   - Match by normalized name and location, then stage extension changes for approval. Record unmatched contacts rather than guessing.

5. **Publishing**
   - The secured admin API produces a sanitized `staff-public.json` for the public directory.
   - A deploy hook or GitHub Actions job rebuilds and publishes the public site only after approvals.

## Safe next implementation decision

Before building the connector, choose its hosting and sign-in boundary. The existing protected `inventory-ops.joegallant.me` environment is a natural place if it is the intended dealership-admin surface; otherwise, provision a separate protected application and database. That decision determines where credentials, audit logs, and editor permissions live.
