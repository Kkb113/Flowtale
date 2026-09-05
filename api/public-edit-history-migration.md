# Published edit-history repair

Deploy the API's public edit projection and repair existing publication files during a maintenance window. Stop application writers and back up object storage first. The repair changes public playback copies only; draft undo history remains private and intact.

Run `node jobs/scripts/migrate-public-edit-history.js` with `ASSET_BUCKET_NAME`, `PVT_ASSET_BUCKET_NAME`, `FABLE_ASSET_ROOT` and `AWS_S3_REGION` set to the deployment values. The backup bucket must be private and distinct from the public bucket. Each changed original is backed up under `migration/public-edit-history/<content-sha256>/<original-key>` and read-back verified before its public copy is changed. For local storage, also set `AWS_S3_ENDPOINT` and local fixture credentials. The default is a read-only dry run. Invalid published formats abort discovery before any writes; inspect and repair the reported publication rather than skipping it.

Run with `--apply --maintenance-confirmed` after reviewing the dry run. The script rewrites only numbered tour edit files and versioned publication screen edit files, preserves their cache policy, and verifies each write by reading it back. Repeat the dry run and require zero changes. Storage failures can leave a partially repaired set; keep maintenance active and retry the same command. It is repeatable.

For CDN deployments, invalidate the exact paths reported by the applying run using the configured distribution, and wait for invalidation completion before ending maintenance. A zero-change rerun does not prove an earlier CDN invalidation completed. Retain the applying report and invalidation ID with deployment evidence. Direct local storage needs no CDN operation. Verify anonymous reads through the delivery hostname and confirm authorized drafts still retain their undo values.

This repair removes historical undo values from public edit files. It does not sanitize the original serialized screen tree or image/thumbnail content beneath visual blur, hide or mask. Those delivery changes remain a separate open Phase 0 requirement. Do not present this script as complete secure-redaction remediation.
