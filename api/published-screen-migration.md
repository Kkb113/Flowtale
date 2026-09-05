# Historical published-screen repair

Use this repair after the private-draft and public edit-history migrations. Stop API and worker writers and retain a storage backup for the maintenance window. It compiles each historical snapshot from that version's own screen and edit files; it never substitutes the current draft.

Build the API with `./mvnw verify`. The packaged compiler runs without starting the API:

```text
java -Dloader.main=com.sharefable.api.common.PublishedScreenTool -cp api/target/api-1.3.29.jar org.springframework.boot.loader.PropertiesLauncher
```

Set `FABLE_PUBLICATION_COMPILER` to a JSON array containing that command and its arguments. A container invocation is also supported as an argument array; mount the verified JAR read-only and pass stdin through. The script uses a subprocess without a shell. Set `ASSET_BUCKET_NAME`, `PVT_ASSET_BUCKET_NAME`, `FABLE_ASSET_ROOT`, `AWS_S3_REGION`, and optional `AWS_S3_ENDPOINT` for the deployment. The backup bucket must be private and distinct from the delivery bucket.

1. Run `node jobs/scripts/migrate-published-screens.js` for a read-only dry run. An unresolved legacy target or overlapping edit stops validation before public mutations. Review and repair the reported snapshot; never skip it and infer privacy completion.
2. Run with `--apply --maintenance-confirmed`. The script validates the entire discovered set, verifies private originals and staged replacements, then records a private repair plan before the first public write. It rewrites screen bytes and effective edit files, removes flattened globals, strips redacted screen thumbnail/icon/source URL references from every discovered alias, empties unsafe thumbnail manifests, and removes generated GIFs for affected aliases. Original drafts remain unchanged.
3. If interrupted, keep writers stopped and run the same command again. The pending plan resumes from verified replacements, avoiding recompilation against partially updated screen/edit pairs. A dry run reports a pending plan explicitly. Completed plans and backups remain private for audit/recovery.
4. Repeat the dry run and require `changed: 0` and no pending plan. Validate anonymous player responses and authorized authoring access.
5. For CDN delivery, invalidate the reported paths and wait for completion before ending maintenance. Preserve the applying report and invalidation ID; a zero-change dry run does not establish cache revocation.

This repair covers published JSON and the listed publication derivatives. Complete the [capture asset privacy cutover](capture-asset-migration.md) to migrate image, thumbnail and proxy originals and verify CDN revocation. JSON repair alone does not establish asset privacy.
