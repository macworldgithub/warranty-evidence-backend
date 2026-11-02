# Backend notification projects

Android retains the existing `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_PATH` settings (or existing email/private-key environment credentials).

Add these settings on the backend server for iOS:

```env
FIREBASE_IOS_PROJECT_ID=booranwarranty-41945
FIREBASE_IOS_SERVICE_ACCOUNT_PATH=./booranwarranty-41945-firebase-adminsdk-fbsvc-96e0c23563.json
```

Store the credential securely on the server, not in Git. Build and restart the backend after deployment. `/api/v1/notifications/status` reports initialization separately for Android and iOS; initialization alone does not prove device delivery or APNs readiness.

Device registration remains `POST /api/v1/notifications/devices/register` with `token`, `userId`, and `platform`. The server records the associated Firebase project. Existing records without project metadata continue to use the old project, including legacy iOS tokens. Updated iOS builds must register their new-project tokens. Do not bulk relabel old tokens.

For a test with an unregistered iOS token, use `/api/v1/notifications/test-push` with `platform: "ios"`, `token`, `title`, `body`, and initially `dryRun: true`. No platform means the original project for an unregistered test token. For saved tokens the saved project takes precedence. Topic tests without a platform target both projects.

Case notifications now use registered tokens only, rather than topic fallback, to avoid sending user-specific case information to logged-out topic subscribers. The unregister endpoint removes only the specified device association and attempts to unsubscribe known application topics in that token's project. Subscription cleanup failures are logged, and device association removal still proceeds. Queued notifications may still arrive.

The mobile app must call `/notifications/devices/unregister` with its token on logout, before discarding local session/token state. This backend change cannot detect a purely local logout. The existing mobile notification service inspected during this change did not contain an unregister request; the mobile team must verify and implement the logout call. No mobile files were changed.

Before production release, test Android and iOS in foreground/background/closed states, mixed recipients, tap behaviour, token refresh and logout. APNs configuration and mobile builds remain the mobile team's responsibility.
