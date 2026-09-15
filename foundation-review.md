# Foundation alignment review

Date: September 15, 2026. Scope authority: `implementation.md`, Section 8 and its user-directed core-product boundary.

## Review boundary

Reviewed the current architecture and core workflow dependencies across the shared package, Chrome extension, React client, Java API, workers, local stack and CI. Inspected every uncommitted production-code change and its callers, storage formats, cleanup paths and regression coverage. Existing editor, save, publication, private-asset and worker entry points were checked against the source inventory in Section 2 of the implementation plan.

This is a bounded architectural and regression review, not a claim that every line or every production browser/tenant combination is defect-free. Billing, membership expansion, new AI providers and secondary-product expansion remain deferred. No editor replacement, document migration or general refactoring was introduced during this review.

## Alignment findings

| Boundary | Ownership and result |
| --- | --- |
| Recording | Extension background owns active capture state; serializer owns recorded documents; screenshot helper owns browser capture retries. Original automatic completion is restored for unavailable embedded frames after five quiet seconds. Root documents and screenshots remain required. The persisted deadline survives worker restart. |
| Transfer | Extension retains a session payload until the client commits it and acknowledges its checksum. The shared capture-storage module owns IndexedDB record selection and atomic writes. Independent recordings do not overwrite or block one another. |
| Creation | The capture identifier follows preptour, login and creation. Locks are per recording; upload/create receipts and final cleanup remain in the existing creation pipeline. Cleanup compares the stored recording identity/content before deleting its own record. |
| Local authentication | Manual local workspace sign-in follows extension-created tabs; automated identities remain tab-specific. Existing loopback/development restrictions still exclude local authentication from production. |
| Remote authentication | Review found that remote login omitted the recording ID from Auth0 state, and the legacy callback could navigate twice. Login now carries the ID through the callback, and callback storage lookup uses the same shared capture reader. Navigation is cancelled after unmount and the database connection is closed. The unused one-slot reader was removed after checking all callers. |
| Editing and saves | Existing DOM/FID editor and graph remain intact. Journal, acknowledgement, revision and conflict handling remain the persistence boundary. No alternate canvas editor or second editing model was added. |
| Playback and publication | Existing graph/player, forms, branches, responsive rendering, media and publication readers remain consumers of the same saved formats. Private originals and public redaction derivatives retain separate ownership. |
| API and workers | Existing service authorization, storage ownership, media processing and queue acknowledgement boundaries remain intact. Recorder corrections do not bypass API persistence or replace worker behavior. |
| Specification | Corrected the overly broad prohibition on timer-based completion. A bounded wait for optional embedded responses is compatible with durable transfer; a timeout is not proof of primary capture or save success. |

The identified recorder regression came from requiring Chrome's entire frame inventory to respond, rather than preserving upstream's bounded fallback. Screenshot quota retry and duplicate screenshot suppression address another browser-specific interruption. These corrections belong to the existing capture boundary; they do not require new product architecture.

## Remaining debt and later work

| Item | Disposition |
| --- | --- |
| Large legacy editor/action/creation modules | Existing coupling remains. Split along the planned document/editor boundaries in Phases 1–2, supported by the current regression suite; do not attempt an unrelated rewrite now. |
| Separate screen, tour, global-edit and loader writes | Explicit existing limitation. Aggregate document transactions are Phase 1 work, not a completed foundation capability. |
| Toolchain, lint and bundle warnings | Existing non-blocking warnings remain; no general dependency upgrade or bundle optimization was added. |
| Production storage/CDN migration and browser coverage | Local validation does not complete production rollout. Follow the existing migration procedures and later production qualification. |
| Billing, membership expansion and new AI | Deferred by the agreed scope. Existing shared core dependencies remain protected. |

## Verification

The preceding live MotionBiz check transferred all nine recorded screens, and the user confirmed normal recording works again. Automated recordings use isolated browser profiles and test workspaces; existing user recordings are preserved.

| Gate | Result |
| --- | --- |
| API | 206 tests, zero failures/errors/skips; Java 17 verify and executable JAR packaging passed in an isolated build directory. |
| Workers | 105 tests and lint passed; clean TypeScript/schema build and pinned FFmpeg container build passed. |
| Shared/client/extension | 40 shared + 262 client + 41 extension tests passed (343 total); lint, extension compilation and optimized production build passed on the final runtime source. |
| Full local product suite | 39/39 passed before the narrow remote-login correction; covers capture/creation, editor conflicts and saves, branches/forms, media, publication and deletion. |
| Packaged extension | 12/12 passed, including worker restart, tab closure, no-click recording, screenshot quota/readback, hidden/missing/nested frames, failed retention and reload. |
| Standalone browser suite | 5/5 passed for atomic recording storage, multiple captures, renderer and semantic edit recovery. |
| Contracts and whitespace | Generated API contract consumers match; whitespace checks pass. |

Remote Auth0 routing is tested at the application boundary with a mocked provider, including actual login state construction and callback navigation. This does not claim a live external Auth0 login was performed. Local callback-to-creation browser results are recorded in the final checkpoint below.

Verification-environment corrections: building over the running API's bind-mounted JAR caused an artifact read error. A separate clean build passed; the verified executable JAR was restored with the service stopped before restarting it. Future checks while the application is running must use a separate API output directory/container. Rebuilding workers over generated test-image output also conflicted with TypeScript inputs; the clean build passed. Neither failure required a product architecture change.

## Final checkpoint

After restoring the API and rebuilding the client, all three focused browser checks passed: actual auth-callback-to-demo creation, creation while another recording remains saved, and local sign-in/workspace persistence in a new tab. No page errors, external calls or failed HTTP responses were reported by the two creation cases.

The review found and corrected the remote-login handoff gap and the specification mismatch. No unresolved critical/high-severity core blocker was identified in the reviewed boundaries and passing local checks. Phase 0 remains aligned with its agreed scope and is ready for Phase 1 planning/implementation, subject to the explicit remaining debt and production qualification limits above. The existing architecture is recognizable and its ownership boundaries are preserved; this conclusion is not a claim that the legacy codebase is fully decoupled or universally defect-free.
