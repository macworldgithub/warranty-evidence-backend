# Booran Motors historical archive

Read-only WorkPhotos records are separate from active warranty cases and dealership assignments. Access requires an active authenticated ADMIN account, or a CLERK account with one of these exact email addresses: clerk@dandenong.com, clerk@morang.com, clerk@skoda.com. Other and future clerks receive no archive access. The server checks every list, detail and download request; frontend visibility is only a convenience.

## Import and deployment

From the backend directory:

```
node tools/import-workphotos.mjs "../tools/workphotos-archive/archive" "./private/workphotos"
```

The importer leaves source files untouched, verifies SHA-256 checksums, stores immutable content-addressed objects and publishes its index only after completion. Repeated imports update existing source job IDs without duplicating records; records absent from a subsequent export are retained. Run only one importer at a time. Files are copied without extracting ZIPs. Original PDF reports and photo ZIPs can be downloaded through the portal. Report text is searchable; generic job-list captures are preserved as files but excluded from search.

Mount the entire private/workphotos directory on persistent backend storage and back it up independently. Set WORKPHOTOS_ARCHIVE_DIR to its absolute path if the backend is started from another working directory. Never place it under public, uploads, a static web root, or a public bucket. The index and all objects must travel together. A normal Git deployment excludes this data; deploy both application code and this private data directory. No production upload is performed by the local importer.

Start/restart the backend after deploying the module and deploy the frontend. The new route is /historical-archive. Missing storage produces an unavailable message rather than an empty successful archive. Confirm each of the three real accounts can list/search/download and an unrelated clerk gets 403, including on direct API links. Automated tests cover the route authorization with a mocked session resolver; live sessions still require a deployment smoke test.

Export caveats are retained per job. Captured dates are export dates, not repair dates. Export collection covered the jobs visible to its source account/filters; completeness across other workspaces/statuses is not established. Existing WorkPhotos files are preserved even when the text export is incomplete.

## Checks

```
node --test tools/import-workphotos.test.mjs
npm test -- --runInBand historical-archive
npm run build
```
