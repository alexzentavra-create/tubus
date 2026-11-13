# Bien Parada — implementation and follow-up audit

Reviewed November 12, 2026. Repository: `C:\Users\aleja\.gemini\antigravity\scratch\tubus`.

## Implemented in this change

- Sharper dashboard surfaces, defined borders, glass header/navigation, accessible chat and notification dialogs, and responsive layouts.
- Presence backed by a shared database, keyed by authenticated account and browser session. Both admins can appear online together. Normal logout removes presence; an interrupted connection expires after 90 seconds.
- Persistent internal messages with server-confirmed saves, retry without duplication, preserved drafts on failure, and older-message loading. Removed the example conversations and editable sender identity from the internal chat.
- Real WebRTC voice/video connections, incoming call acceptance/rejection, microphone/camera controls, and remote hangup.
- Recording after participant consent. Each participant records both media streams locally and attempts an automatic download at the end. A manual download link remains available while the meeting dialog stays open.
- Database-backed notification history and per-account read receipts for internal messages, calls, calendar activity, synchronized administrative changes, and instrumented local dashboard edits. Local-only changes are labeled accordingly; notifications do not make the underlying legacy feature persistent.
- Awaited Supabase authentication for the existing Super Admin login path. Alejandro's established Yahoo login maps to the existing dedicated admin Auth account. Repaired NULL Auth metadata in that old SQL-seeded account without changing its password.
- Dedicated collaboration membership for the two verified admin accounts, independent of the legacy editable profile role. New tables reject direct anonymous/authenticated database access; the server checks both membership and role.

Supabase tables and the legacy Auth repair have been applied. Supabase configuration has been saved locally and in Render. No secret keys are included in the source changes.

## Verification

Two isolated Chrome contexts, two temporary test accounts, the real Supabase database, and a local Next.js server were used. Camera/microphone inputs were synthetic; this did not call Alejandro or Nestor.

Passed: concurrent presence, simultaneous message writes, idempotent retry, reload persistence, independent notification reads, unauthenticated request rejection, cross-origin mutation rejection, failed-save draft retention and successful retry, incoming video call, real WebRTC connection and video frames, recording consent, downloads on both participants at hangup, audio-only call, mute, remote hangup, mobile dialog containment, and no browser runtime errors in those flows. Temporary accounts and test database records were removed.

TypeScript and a production build were run. This is not a claim that every application route or every real network/device combination has been tested.

## Operational limitations

- Both admins should sign out and back in after deployment so they have real Supabase sessions. The legacy master/password bypass is not accepted as a Supabase identity by the new collaboration API.
- A TURN relay is not yet configured. Direct WebRTC passed the tests, but restrictive Wi-Fi, carrier NAT, or firewalls can prevent calls across some networks. The implementation supports `TURN_URLS` plus a shared secret or provider credentials. A relay/provider still needs to be selected and configured.
- Browser download restrictions can require the manual recording link. Closing/crashing the tab before recording finalization can lose the recording. Recordings are kept in browser memory until downloaded and are not uploaded to cloud storage.
- New Super Admin accounts need real Supabase Auth provisioning and server-controlled collaboration membership. The existing local account editor does not do that; see finding 3.
- Notifications show the most recent 100 events. Older events remain in the database. The feed is an operational activity feed, not an immutable security audit.

## Unrelated findings for your decision

These were identified by source inspection unless explicitly noted. They were not comprehensively repaired in this dashboard change.

| Priority | Finding and user impact | Evidence in the repository | Recommended next change |
|---|---|---|---|
| Critical | The legacy sync endpoint exposes and accepts account/configuration data without verifying the user's role. Its sanitizer returns values unchanged, including password fields. Its in-memory store can reset on deployment or differ between server instances. | `src/app/api/sync/route.ts:5`, `:179`, `:183`, `:213`; `src/lib/sync.ts` | Replace it with authenticated, scoped database operations. Remove plaintext passwords from client data and responses. |
| Critical | Existing database migrations permit unsafe privilege assignment: the profile policy allows users to update their own row, signup copies a role from editable user metadata, and the privileged account-seeding function has no explicit execution revocation in the repository. Effective live function grants need a separate audit. | `supabase/migrations/001_schema.sql:201`; `supabase/migrations/002_seed_accounts_and_lines.sql`, functions `seed_app_account` and `handle_new_user` | Lock down role changes, always assign a safe signup role, restrict privileged provisioning functions, and audit actual deployed policies/grants. The new collaboration membership check does not fix the entire legacy authorization model. |
| High | Super Admin creation/password editing and some settings update browser records and show success without provisioning/updating Supabase Auth. An edited password therefore may not work on the real authentication path. | `src/app/admin/super/page.tsx`, account creation/password handlers and `handleSaveSuperAdminSettings` | Move account lifecycle and password changes to authenticated server endpoints backed by Supabase Auth. |
| High | The line-admin support chat generates random delayed “Super Admin” replies locally. It does not establish an actual support conversation with the Super Admin. | `src/app/admin/company/page.tsx:405`, especially the `Mock response from Super Admin` block | Replace the simulated support channel with a separate persistent conversation model. |
| High | Payment notifications are blocked by the private-access middleware unless they have the browser gate cookie. The webhook itself only logs approved payments; it does not persist a payment or fulfill an ad/subscription. | `src/middleware.ts:55`; `src/app/api/mercadopago/webhook/route.ts:27` | Provide a dedicated authenticated/signature-verified webhook path, idempotent payment persistence, and actual fulfillment. |
| High | Daily access-code information is returned by an endpoint exempted from the private-access gate. The deployment cookie is a static value checked for equality rather than a signed, expiring server-verifiable token. | `src/app/api/access/daily-code/route.ts`; `src/middleware.ts:48`, `:55`; `src/app/api/verify-access/route.ts` | Restrict code disclosure to authorized admins and replace the static gate value with a verified session/token. |
| Medium | Analytics and reports APIs accept only role `admin`, rejecting `superadmin`. | `src/app/api/analytics/route.ts:16`; `src/app/api/reports/route.ts:56` | Define and test the intended role matrix for each API. |
| Medium | Tasks, points of interest, report status changes, tips, terms/history, and some settings still have browser-only storage paths. Other devices can show different data, and clearing browser data can lose changes. | `src/app/admin/super/page.tsx`: `saveTodos`, `handleSavePoi`, `handleToggleResolveStatus`, `saveTips`, `handleSaveTerms`; `src/lib/termsData.ts` | Migrate these features one at a time to database tables with role checks and explicit save errors. |
| Medium | The dashboard's performance chart uses a fixed `METRICS_BY_PERIOD` dataset, so it should not be treated as measured production activity. | `src/app/admin/super/page.tsx:42`, chart data binding | Replace it with real aggregated data or clearly label it as demonstration data. |

Suggested order: legacy authorization/credential exposure, durable account management and general sync, payment fulfillment, real support chat, then the remaining local-only features and analytics.

## Technical references

The legacy Auth repair follows [Supabase's documented NULL-column troubleshooting](https://supabase.com/kb/troubleshooting/database-error-saving-new-user-RU_EwB). The media connection uses the browser's [WebRTC signaling and calling APIs](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling).
