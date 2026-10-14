# Technician invitations

This is an optional onboarding flow. Existing login, registration, OTP, admin account creation, technician app, archives and uploads are unchanged. The only wiring additions are InvitationsModule in AppModule and an admin-only portal navigation entry.

## Configuration

Set `INVITATION_PORTAL_URL=https://booran-warranty-new.vercel.app` in the production backend environment. Links point to the frontend `/accept-invite` page, not the backend URL. For local UI testing use `http://localhost:3000`. Reuse existing SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS and optionally SMTP_FROM settings. Invitation mail has its own sender and never falls back to simulated delivery. SMTP acceptance indicates a send was accepted; it cannot guarantee inbox delivery.

Deploy the backend and frontend together. No technician app build is needed. MongoDB must support transactions (Atlas does); acceptance deliberately has no non-transactional fallback. A new invitations collection and partial unique index enforce one ongoing invitation per email. Keep normal index creation enabled, or provision the schema's indexes as part of deployment.

## Flow

Administrators open `/invitations`, enter a name/email and active primary site, and send the invitation. It remains separate from users until accepted. Resend rotates the link and resets its 72-hour expiry. Cancel invalidates it. Failed SMTP sends are visible and retryable. A send interrupted by a process restart can be resent after five minutes. History is retained; the list shows at most the latest 500 invitations. Cancelled recipients can be invited again.

The public setup page reads a 256-bit token from the URL fragment. Tokens are stored as SHA-256 hashes and not returned by the management API. Inspect is a read-only POST, so email preview/scanning GETs do not accept invitations. Acceptance fixes the invited email, name, TECHNICIAN role and primary dealership, and atomically creates a compatible user and marks the invitation accepted. It uses the existing credential representation so current login continues to work. A broader password-storage migration is outside this feature's scope. Never log invitation secrets or passwords.

Users set a password in the browser and then log into the existing technician app. This does not replace or restrict current self-registration. Existing users should use password reset instead of an invitation. Public setup routes can also be covered by your hosting's normal abuse/rate controls; do not expose token/password bodies in request logs.

## Verification

Run `npm test -- --runInBand invitations` and `npm run build` in the backend. Type-check the frontend and check the two new pages. Lifecycle tests use an in-memory transaction model; a production/staging smoke test with Atlas and a designated test email is still required after deployment. No real email or production account is created by automated tests.
