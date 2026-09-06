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

The compiler removes redundant iframe `srcdoc` from redacted screens; playback reconstructs the compiled child tree. New publications resolve generated content against the private selected elements, including scoped/inherited custom properties, and remove only identified protected values from inline, linked and adopted CSS. Unrelated generated text/icons and private originals remain intact. Matching protected values shared elsewhere are also removed to prevent recovering them through another CSS rule. Selector matching uses the existing jsoup dependency, updated for [modern selector support](https://jsoup.org/apidocs/org/jsoup/select/Selector).

Publication schema 2 together with API-written S3 user metadata `fable-publication-schema: 2` identifies selective output. The migration preserves that metadata and does not run legacy blanket CSS cleanup on those versions; a JSON marker alone is untrusted. Older versions still require the one-time privacy repair because removed target context cannot be inferred safely. If an earlier blanket repair already omitted an icon/label, review the retained private draft and publish a new version; this restores unrelated generated content through the selective compiler. Do not replace historical versions with the current draft or restore unsanitized CSS from backups directly to public storage.

Rerun this repair after upgrading the compiler even if the previous run reported zero changes. Already-compiled screens retain their redaction marker, so flattened edits do not bypass cleanup. Version-owned CSS assets are included in the verified backup/resume plan. Finish any existing pending plan first, then run a fresh repair and require zero remaining changes.

This repair covers published JSON, version-owned CSS and the listed publication derivatives. Complete the [capture asset privacy cutover](capture-asset-migration.md) to migrate image, thumbnail and proxy originals and verify CDN revocation. JSON repair alone does not establish asset privacy.
