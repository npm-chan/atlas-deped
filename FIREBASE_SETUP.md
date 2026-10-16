# Firebase account isolation setup

ATLAS stores private scheduling data under `users/{uid}/...`, where `uid` is
the immutable Firebase Authentication UID. User profile documents are kept
separately at `userProfiles/{uid}`. Firestore Rules in `firestore.rules` deny
access to legacy top-level collections and to the old `/users/{uid}` documents.

## Deploy the rules before using the updated app

1. Back up the Firestore project and preserve an export of the existing
   `/users/{uid}` documents and root `teachers`, `sections`, and `subjects`
   collections for manual ownership review. Legacy snapshots may contain
   school-wide/shared data and must not be copied into a user's private space
   without verified ownership.
2. Install the Firebase CLI, run `firebase login`, and open a terminal in this
   directory.
3. Deploy the restrictive rules to the project used by the app:

   ```powershell
   firebase deploy --only firestore:rules --project atlas-36aed
   ```

   Confirm the CLI reports a successful deployment. Do not leave the prior
   rules active while distributing the updated app.
4. In Firebase Console, enable Authentication providers used by the app and
   confirm email verification is enabled for email/password accounts.
5. Host the app over HTTPS (or use `localhost` for local development).

The web API key in `index.html` identifies the Firebase project; it is not an
authorization secret. The published Firestore Rules and Firebase Auth token
are the access controls.

## Registration and verification

Registration creates a Firebase Authentication account and a
`userProfiles/{uid}` profile with role `pending` while email is unverified.
The user remains signed in by Firebase Auth. ATLAS checks verification in the
background; after confirmation, it changes only that user's profile from
`pending` to `admin` and opens that user's private workspace. Firestore Rules
permit that transition only for the matching authenticated UID with a verified
email. An administrator in one workspace has no access to any other UID.

## Existing data and migration

The old shared top-level entity collections and old `/users/{uid}` documents
are deliberately denied to application clients. The old profile documents can
contain shared/unowned records, so the updated app does not restore them or
claim them for the first person who signs in. Existing local data under the
old unscoped storage key is likewise not loaded into any new account.

Review legacy exports using a trusted project administrator and assign records
to a UID only when ownership is independently verified. Migrate reviewed
records with a trusted Firebase Admin SDK process, not with a client-side
browser script. Keep ambiguous records quarantined. A backup file without a
matching `accountUid` is rejected by the application import flow.

## Verify the isolation

Test first with the Firestore Emulator or a non-production Firebase project:

1. Create and verify Accounts A and B. Confirm each gets a different Firebase
   UID and its own `userProfiles/{uid}` document.
2. As A, create records in each app module and confirm data is written under
   `/users/{A_UID}/...`.
3. Sign in as B in the same browser. Confirm there is no A data in the app,
   local storage namespace, or IndexedDB database; create and edit B records.
4. Sign back in as A and confirm A's records are unchanged.
5. With B's authenticated ID token, attempt direct reads and writes under
   `/users/{A_UID}/teachers/...`, `/users/{A_UID}/appData/...`, and
   `/userProfiles/{A_UID}`. Each must be denied. Repeat for updates and deletes.
   Also try writing an `appData` snapshot whose `accountUid` is A while using
   B's own path; the write must be denied.
6. Confirm root paths such as `/teachers/...` and `/subjects/...` are denied.
7. Export A's data and confirm B cannot import it. Export/import A's own
   account backup, test CSV flows, disconnect the network for edits, reconnect,
   and verify only the same UID's queue is synchronized.
8. Sign out and confirm the app returns to the login screen without showing
   any previous account data.

Use Firebase Console's Rules Playground or Emulator Suite rules tests for
direct-access checks. The application code cannot deploy rules to the Firebase
project; deployment and the direct-request tests must be completed by a project
administrator.
