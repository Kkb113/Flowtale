# Draft document storage migration

This migration moves existing tour, screen and hub draft JSON into the private bucket. Public screen JSON and edits are copied into `ROOT/ptour/assets-TOUR_HASH/VERSION/screens/SCREEN_HASH/` before raw sources are removed. Existing publication filenames, aliases and published edit versions are preserved. This is not secure-redaction compilation or deletion of previously published content.

## Deployment order

1. Deploy the authorized draft-reader API/client/worker checkpoint before changing storage. Stop all API, worker and administrative writers for the migration. Keep object storage available. Take the normal storage/database backup.
2. Run the script in dry-run mode. Resolve every missing publication source, malformed reference or conflicting private copy; do not skip failed objects. Existing private content is never overwritten when its bytes differ.
3. Run with `--apply --maintenance-confirmed`. Every new copy is read back and SHA-256 checked. No old public draft is removed until all publication snapshots and private copies pass. The public bucket policy retains existing statements and explicitly denies reads of the old raw draft paths, including access through an authenticated CDN origin. Deletes are checked using object listing because the deny also blocks HEAD requests.
4. For a CDN deployment, invalidate the three path prefixes emitted in `cdnInvalidationPaths`, and wait for invalidation to complete before reopening traffic. The local endpoint has no CDN. Invalidation cannot erase bytes previously downloaded by a viewer.
5. Deploy the API storage switch and client publication reader together, then resume writers. Verify authenticated draft reads, anonymous draft denial, existing published playback, image/HTML editing, new capture, save/reload and republishing. New API writes use private storage; no runtime public-draft fallback exists.

For local development, stop `api` and `jobs` with `api/compose.local.yml`. Use local fixture S3 credentials (`test`/`test`) and run from the repository root:

```text
node jobs/scripts/migrate-draft-storage.js --endpoint=http://localhost:14566 --source-bucket=fable-local-assets --private-bucket=fable-local-private --root=local --profile=local
node jobs/scripts/migrate-draft-storage.js --endpoint=http://localhost:14566 --source-bucket=fable-local-assets --private-bucket=fable-local-private --root=local --profile=local --apply --maintenance-confirmed
```

For hosted storage, omit the endpoint and provide the deployment's bucket names, region, root qualifier, profile and normal authorized AWS credentials. The script defaults to dry run. The profile/root must match `S3Config`; for example, public `root/tour/HASH/index.json` becomes private `staging/root/tour/HASH/index.json` for the staging profile.

## Retry and recovery

The migration is repeatable. Existing publication snapshots are retained; existing private drafts must match before a remaining public copy is removed. A verification failure leaves public sources intact. A deletion interruption can be rerun: the verified private copies and bucket deny remain in effect. If an obsolete writer recreates a denied public source, stop it and review that source against the private copy through a controlled maintenance policy change; do not bypass a conflict.

Do not roll back to a release that reads or writes public draft objects after this migration. Recover the new reader/storage release or restore the coordinated backup in maintenance. Do not remove the deny to make an old client appear functional. Keep the backup private under the deployment's retention policy.

The local infrastructure initializer preserves the deny. For existing unmigrated volumes, run the migration before running the updated initializer. Fresh volumes use the new boundary immediately.
