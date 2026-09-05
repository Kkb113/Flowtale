# Capture asset privacy cutover

Phase 0 keeps draft screen images, thumbnails and captured proxy assets private. Draft readers authorize the current workspace; public versions own independent, compiled derivatives. Opaque redaction removes protected contents and the measured image resources from those derivatives. Generic uploaded narration, video and intentional replacement images retain their existing media lifecycle.

## Maintenance order

Use the same verified API/worker release for the entire cutover. Back up the database and both buckets. Stop API, workers and capture writers; wait at least eleven minutes after the last legacy public upload so old ten-minute PUT URLs expire. Keep public viewing in maintenance until storage and CDN verification are finished. These scripts require an operator with storage access and default to dry run.

1. Apply schema migrations, including `V1_49__Private_Proxy_Asset_Access.sql`. Run the existing private-draft migration and [publication alias indexing](publication-cleanup.md), then the [historical screen repair](published-screen-migration.md). Do not replace a historical screen with its current draft.
2. Run `jobs/scripts/migrate-source-images.js`. It preserves private image originals, rewrites historical image documents to independent versioned copies, denies anonymous original reads and removes the old objects after verification.
3. Run `jobs/scripts/migrate-common-assets.js` with `--kind=common`. It preserves private originals, copies referenced thumbnails into their owning publication, rewrites metadata, and denies/deletes original UUID thumbnails. Bundled `cmn/ph/` placeholders remain public.
4. Run `jobs/scripts/index-proxy-asset-access.js` before reopening authoring. Set `FABLE_MIGRATION_DB_URL` for the deployment database. It grants access only from database-owned private documents, including nested CSS dependencies. Its durable private plan is a one-time pre-cutover ownership snapshot; never delete the completed plan to rescan post-cutover user edits.
5. Run `migrate-common-assets.js` with `--kind=proxy`. It copies surviving CSS and resources into publication-owned paths, removes blocked redaction resources and authoring URL maps, then denies/deletes legacy proxy originals. An old styled redaction without resource measurements requires explicit review and reapplication in the editor; do not skip this failure or serve its old public content. Historical versions requiring review stay unavailable until repaired from their own backup.
6. Run `jobs/scripts/migrate-captured-images.js`. It identifies legacy blob-origin images from private source documents and old AI screenshot copies by byte equality with private capture thumbnails. It stages private backups and document replacements before saving a durable plan, replaces references with self-contained PNG/JPEG data, and deletes only those proven originals. Unrelated user media is retained. Interrupted runs resume the exact plan and reject concurrent document changes. Keep the completed plan as the cutover record.
7. Repeat dry runs and check zero remaining changes/completed plans. Invalidate every reported CDN path and wait for completion. Test anonymous denial of saved original URLs through both object storage and the CDN; test authorized draft rendering, image cloning, redaction, public playback and publication deletion. Only then reopen writers.

The binary scripts accept these common arguments (use the deployment's values):

```text
--public-bucket=PUBLIC --private-bucket=PRIVATE --root=ROOT --profile=PROFILE
--public-base-url=https://PUBLIC-ASSET-HOST --region=REGION
```

For the ownership index also supply `--private-base-url=https://PRIVATE-ASSET-HOST`. For local S3 use `--endpoint=http://storage:8333` inside the local Docker network. Add `--apply --maintenance-confirmed` only after a successful dry run. Credentials come from the normal AWS environment/provider chain, not command-line arguments. All backups and plans must stay in the private bucket; restrict their retention and access as sensitive source data.

## Supported behavior and limits

Draft image/proxy endpoints return `no-store` and verify workspace ownership before reading bytes. Browser previews resolve private resources into temporary object URLs and release them on teardown. Failed assets expose a retry action. Cross-workspace authorized copies propagate explicit proxy grants; a pasted foreign URL grants no access. Publication expands surviving nested CSS resources and blocks measured redacted resource IDs and inline-image hashes across the whole version.

Legacy redactions with recorded geometry retain it. A legacy text-only redaction without dimensions uses an opaque minimum-size block; exact old layout cannot be reconstructed from absent data. Reapply it in the editor to record dimensions. Unresolved targets, overlapping parent text edits and unmeasured linked-style resources fail publication with a review message, preserving the existing published version. This is the supported review/reapply workflow, not an automatic guess at missing historical geometry.

The local cutover has verified storage behavior; production buckets, CDN invalidation and production historical-data repair require this deployment procedure. Local validation does not certify that existing production URLs have been revoked.
