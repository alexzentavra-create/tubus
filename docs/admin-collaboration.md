# Super Admin collaboration

The private collaboration API is `src/app/api/admin/collaboration/route.ts`. It verifies the Supabase Auth session, a `superadmin` profile, and membership in the private `admin_collaborators` table. Browser storage is not authoritative for messages, presence, calls, notifications, or sender identity.

Apply migrations 004 and 005 to the existing project. They have already been applied to the current production Supabase project. Do not replay non-idempotent migration 004 against that project. Migration 005 repairs missing string metadata in the existing SQL-seeded admin user without changing its password.

Required environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. The last variable is server-only; never expose it via `NEXT_PUBLIC_`, Next.js `env`, logs, or Git. The existing Supabase secret API key is supported under that environment name.

Optional TURN: `TURN_URLS` (comma-separated URLs) and `TURN_SHARED_SECRET` for temporary HMAC credentials, or `TURN_USERNAME` and `TURN_CREDENTIAL` for an existing provider. Without TURN, only direct/STUN-assisted connections are available. Do not claim universal cross-network connectivity without a relay test.

Messages are inserted by UUID and retries reuse that UUID. Timestamps and actor IDs are server-assigned. Presence uses per-browser UUIDs and 90-second expiry. State refreshes every three seconds; call signals are polled every 1.5 seconds. This deliberately does not depend on enabling Supabase Realtime publications. Notifications have per-user read rows.

Calls are one-to-one, use `RTCPeerConnection`, and request actual microphone/camera permissions. Recordings mix both audio streams and render both video feeds into a canvas on each participant. Recordings are local, consent-based, held in browser memory, and downloaded at stop/hangup with a manual fallback link. Browser/tab failure can lose an unfinished recording.

For verification, start the local app on port 3006 and run `node --env-file=.env.local scripts/verify-admin-collaboration.cjs`. It uses real Supabase access, creates two temporary test accounts/memberships, runs isolated headless Chrome contexts with fake media, and removes the test data/accounts in its cleanup. Never run simultaneous copies. The harness intentionally refuses a non-local application URL. It writes screenshots and recordings under `scratch/`; do not commit those artifacts.

The existing local account management UI is not real Auth provisioning. New collaborators must be provisioned through a trusted server/admin process and added to `admin_collaborators`. Existing session users must sign in again after deployment. Alejandro's existing Yahoo admin login aliases the dedicated `admin@admin.com` Auth identity, preserving the separate passenger identity on his Yahoo address.

This change does not repair the legacy `/api/sync`, other local-only features, or their broader authorization weaknesses. Review the accompanying audit before treating the whole app as production-hardened.
