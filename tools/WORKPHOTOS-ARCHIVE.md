# Booran Motors historical archive

Read-only WorkPhotos records are separate from active warranty cases and dealership assignments. Access requires an active authenticated ADMIN account, or a CLERK account with one of these exact email addresses: clerk@dandenong.com, clerk@morang.com, clerk@skoda.com. Other and future clerks receive no archive access. The server checks every list, detail and download request; frontend visibility is only a convenience.

## Import and deployment

From the backend directory:

```
node tools/import-workphotos.mjs "../tools/workphotos-archive/archive" "./archive"
```

The importer leaves source files untouched, verifies SHA-256 checksums, stores immutable content-addressed objects and publishes its index only after completion. Repeated imports update existing source job IDs without duplicating records; records absent from a subsequent export are retained. Run only one importer at a time. Files are copied without extracting ZIPs. Original PDF reports and photo ZIPs can be downloaded through the portal. Report text is searchable; generic job-list captures are preserved as files but excluded from search.

The backend reads from its own archive directory by default, independently of the working directory used to start it. The folder contains index.json and an objects directory with all preserved files. It is separate from uploads; existing uploads and their routes are unchanged. Archive files are served only through the authenticated historical-archive API, never through a public static route.

Upload the entire archive directory to persistent storage alongside the backend package.json and back it up independently. For a different storage location, set WORKPHOTOS_ARCHIVE_DIR to its absolute path (relative values resolve from the backend directory). Never place it under public, uploads, a static web root, or a public bucket. The index and all objects must travel together. A normal Git deployment excludes this data; deploy both application code and this private data directory. No production upload is performed by the local importer.

Start/restart the backend after deploying the module and deploy the frontend. The new route is /historical-archive. Missing storage produces an unavailable message rather than an empty successful archive. Confirm each of the three real accounts can list/search/download and an unrelated clerk gets 403, including on direct API links. Automated tests cover the route authorization with a mocked session resolver; live sessions still require a deployment smoke test.

Export caveats are retained per job. Captured dates are export dates, not repair dates. Export collection covered the jobs visible to its source account/filters; completeness across other workspaces/statuses is not established. Existing WorkPhotos files are preserved even when the text export is incomplete.

## Checks

If reports fail to open or ZIP downloads appear empty in production while the local originals work, check whether the server has Git LFS pointer files instead of their contents. Run `git lfs pull` in the production backend checkout, then restart the service. The archive objects must be their full sizes, not small text files beginning with `version https://git-lfs.github.com/spec/v1`. A Git-based build must download LFS objects before packaging, and include them in the runtime. When the hosting platform cannot include the archive, use private persistent storage and WORKPHOTOS_ARCHIVE_DIR instead. The API rejects pointer files and size mismatches; this safeguard does not download missing server files.

```
node --test tools/import-workphotos.test.mjs
npm test -- --runInBand historical-archive
npm run build
```
