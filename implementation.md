# Fable Production Implementation Specification

**Status:** Phase 0 core implementation accepted on 2026-09-06 against the user-directed scope in Section 8. [Acceptance evidence](phase0-review.md) records passing local validation and retained limitations. Production rollout requires the [asset privacy cutover](api/capture-asset-migration.md). Phases 1–5 remain planned.

**Reviewed:** 2026-09-05. **Repository baseline:** `c20e085` — establish safe demo editing foundation.

**Objective:** A polished interactive demo platform whose capture, editor, AI, playback, and delivery work consistently from recording to published viewer experience.

This replaces the previous implementation plan. It is the source of truth for scope, architecture, migration requirements, and acceptance. Tickets and supporting designs must reference its requirement IDs. A necessary architectural change must update this document and all affected gates before implementation proceeds.

A phase is complete only when its supported workflows, existing data, failure recovery, dependent surfaces, and decommissioning are complete. A component, feature flag, or isolated test passing does not establish completion.

## Contents

1. [Product decisions and research](#1-product-decisions-and-research)
2. [Current architecture and evidence](#2-current-architecture-and-evidence)
3. [Target architecture and durable editing](#3-target-architecture-and-durable-editing)
4. [Rendering, geometry, and interaction design](#4-rendering-geometry-and-interaction-design)
5. [Capability migration matrix](#5-capability-migration-matrix)
6. [Capture, playback, narration, and AI contracts](#6-capture-playback-narration-and-ai-contracts)
7. [Publication, privacy, and adjacent systems](#7-publication-privacy-and-adjacent-systems)
8. [Phase 0: review, stability, and foundation](#8-phase-0-review-stability-and-foundation)
9. [Phase 1: complete document and persistence migration](#9-phase-1-complete-document-and-persistence-migration)
10. [Phase 2: complete visual editor and player scene](#10-phase-2-complete-visual-editor-and-player-scene)
11. [Phase 3: providers, creation, and narration](#11-phase-3-providers-creation-and-narration)
12. [Phase 4: grounded creation and reviewed copilot](#12-phase-4-grounded-creation-and-reviewed-copilot)
13. [Phase 5: production qualification and rollout](#13-phase-5-production-qualification-and-rollout)
14. [Verification, migration, retirement, and completion](#14-verification-migration-retirement-and-completion)

## 1. Product decisions and research

### 1.1 Product outcomes

An author must be able to record a product, create manually or with AI, edit visually, recover work after failure, preview exact behavior, and publish confidently. A viewer must be able to follow instructions, choose paths, return from optional branches, complete forms, and control narration on desktop, mobile, and embeds.

The product should explain what can be edited, what is currently selected, what will change, whether changes are saved, and what viewers will receive. Source-code concepts such as DOM paths and annotation group IDs belong in diagnostics, not normal user flows.

### 1.2 Binding decisions

| ID | Decision | Implication |
| --- | --- | --- |
| D01 | Keep one HTML-based interactive demo product. | Preserve editable captured HTML, image fallback, uploads, and mixed-screen demos. No separate screenshot product selector. |
| D02 | Canvas-first means a unified visual workspace backed by HTML and a shared DOM/SVG scene. | Retain HTML text, layout, fonts and scrolling. Do not rasterize the product into a bitmap editor. Retire every old authoring controller nonetheless. |
| D03 | Retain React, the Java API, jobs, MySQL, PostgreSQL analytics, and object/queue infrastructure. | Improve boundaries without a framework rewrite or new microservice topology. |
| D04 | One semantic command system owns persisted authoring changes. | Manual controls, creation, AI and background asset attachment share validation, preview, history and commit behavior. |
| D05 | Editor, zoom, responsive anchoring, flow editing and player integration are one migration boundary. | They ship together in Phase 2; zoom cannot be completed separately while annotations still use old transforms. |
| D06 | Provide Create Manually and Create with AI after capture. | Both create the same document and open the same editor. Provider failure cannot strand a recording. |
| D07 | Remove AI credits from the product and execution path. | Preserve other subscriptions/entitlements and server abuse, rate, concurrency and expenditure limits. |
| D08 | Narration defaults on for eligible new steps after Phase 3. | Clear global/per-step controls and generation state; existing demos retain their settings and assets. |
| D09 | Use provider-neutral AI/TTS interfaces, initially backed by OpenRouter. | Server-configured models, voices, capabilities, privacy routing, budgets and deadlines. |
| D10 | Local manual workflows have no external runtime dependency. | Real local AI/TTS requires only OpenRouter; local auth, storage, queues, media and integration stubs must work. |
| D11 | Preserve supported advanced capabilities deliberately. | Tour CSS/effects and demo-hub scripts have separate ownership and isolation requirements; neither becomes an old-editor fallback. |
| D12 | Secure redaction is enforced on delivered data. | Blur, hidden DOM, source assets, thumbnails and edit tuples must not accidentally expose redacted originals. |

Retain lead forms, personalization/datasets, branding/inheritance, loaders, media, journey menus, branches, sharing, embeds, analytics, demo hubs, teams, folders, custom domains, and integrations. An affected consumer must migrate in the phase introducing its dependency, not wait for final polish.

Use **demo**, **screen**, **step**, **flow**, **optional branch**, and **chapter** consistently. A screen is captured content. A step is an instruction/interaction on it; several steps can share a screen. A flow is a guided route. An optional branch returns to its origin's continuation. A chapter organizes navigation; it does not introduce a second graph model. Interactive and narrated are playback modes of the same demo.

Defer multiplayer editing, autonomous publishing, arbitrary website operation, free-roaming sandbox demos, avatars, voice cloning, realtime voice agents, general animation timelines, offline export, and full-demo video/GIF export. Existing uploaded media playback remains required. The commented-out GIF generation code is not a functioning export feature.

### 1.3 Research method and findings

Primary sources were checked on 2026-09-05. Product documentation supports UX findings, not claims about competitors' private internals. Earlier in this review, the live HowdyGo editor in Chrome was inspected without content changes: screen-centered editing, filmstrip, selection, Edit UI, blur/hide, zoom rectangle/handles, narration choices, chapters/playback, and AI review mode. A later revisit encountered the account's upgrade preview, so additional behavior was verified through documentation rather than claimed as hands-on testing.

| Source | Finding | Consequence for Fable |
| --- | --- | --- |
| [HowdyGo HTML editing](https://docs.howdygo.com/create/editing-html) | Direct captured text/image editing and global replacement; documented blur/hide also redacts underlying text. | Keep HTML fidelity and inspect public bytes, not just visual masking. |
| [HowdyGo step editing](https://docs.howdygo.com/create/editing-steps) | Steps can be rearranged, inserted, swapped and previewed from the current step; scroll state is associated with editing. | Stable step/screen separation, explicit recapture/remapping and a Save scroll position control. |
| [HowdyGo AI](https://docs.howdygo.com/ai) | Uses captured interactions/context and defaults to previewing edits for acceptance. | Grounded plans, visible scope and review before commit. |
| [HowdyGo narration](https://docs.howdygo.com/create/narration) and [auto-progress](https://docs.howdygo.com/create/auto-progress) | Narration has script/voice/preview/generation controls; progression respects forms and choices. | Treat audio as a complete asset lifecycle and protect interactive decision points. |
| [Storylane HTML editing](https://docs.storylane.io/editing-demos/editing-html-screens) | Inline text, images/SVG, match review, hiding that preserves space, and deletion that reflows. | Typed target capabilities and distinct visibility/privacy/layout operations. |
| [Navattic builder](https://docs.navattic.com/build/demo-builder) | Unified building surface and flow navigation; documentation also identifies capabilities that differ between layouts. | One complete Fable authoring model; alternate views cannot hide required capabilities. |
| [Navattic FAQs](https://docs.navattic.com/help/faqs) | Capture replacement can preserve anchors; publication versions and draft restoration are distinct; keyboard/focus/ARIA support is documented. | Explicit remapping reports, immutable publication, and accessibility requirements. |
| [Navattic responsive strategies](https://docs.navattic.com/build/responsive) and [mobile](https://docs.navattic.com/build/mobile) | Reflow, fixed/scaled capture and mobile navigation are distinct strategies. | Model content layout, fitting, viewer zoom and authored camera separately. |
| [Supademo HTML hotspots](https://docs.supademo.com/article/224-html-based-hotspots) and [branching](https://docs.supademo.com/article/61-demo-branching) | HTML hotspots bind to elements; hotspot/chapter actions can target other steps. | Preserve semantic anchors and expose destinations without flattening Fable's richer branch/rejoin semantics. |
| [rrweb serialization](https://github.com/rrweb-io/rrweb/blob/main/docs/serialization.md) and [sandbox design](https://github.com/rrweb-io/rrweb/blob/main/docs/sandbox.md) | Snapshot reconstruction needs stable node identity and non-HTML state; browser sandboxing is separate from script filtering. | Preserve Fable's serializer, characterize fidelity, and enforce browser isolation around captured content. No wholesale rrweb migration is proposed. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | Dragging needs a single-pointer alternative; keyboard support alone is insufficient. | Numeric placement, move buttons and two-click rectangle creation alongside keyboard/drag controls. |
| [Chrome autoplay](https://developer.chrome.com/blog/autoplay/) and [worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Audible autoplay can be blocked; extension workers can stop. | Explicit Play recovery and durable acknowledged capture transfer. |
| [S3 conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html) and [transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) | Conditional object writes do not create a multi-object/SQL transaction; asynchronous consumers need idempotency. | Immutable objects, atomic DB pointers and idempotent jobs. |
| [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) and [DOMPurify guidance](https://github.com/cure53/DOMPurify) | Fetch destinations and HTML insertion require explicit defensive boundaries. | Harden the proxy and use a maintained sanitizer with tested configuration, alongside a script-disabled capture frame. |
| [web.dev embeds](https://web.dev/articles/embed-best-practices) | Embeds can add substantial resource/main-thread work. | Bounded screen preloading, reserved dimensions, lazy offscreen embeds and no eager full-demo loading. |
| [Anthropic AI evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Evaluate actual resulting state and multiple trials, using deterministic and human grading appropriately. | Grade persisted demo behavior, scope and UX, not the assistant's claim of success. |

Storylane's official search result exposed the relevant documentation; a direct page fetch failed. This is supporting UX evidence, not hands-on verification. No competitor's marketing claim of complete fidelity, privacy or accessibility is adopted as an engineering guarantee.

### 1.4 Provider research

The official [GLM 5.3 Flash listing](https://openrouter.ai/z-ai/glm-5.3-flash) exists and reports tool calling and JSON output, but not JSON-schema enforcement. Keep `z-ai/glm-5.3-flash` as an initial configurable candidate only if it passes Fable's tool-use evaluations. Every output still needs independent validation.

The official [Flux TTS listing](https://openrouter.ai/deepgram/flux-tts:free) exists, describes English speech/model-specific voices, and notes rate limits. `deepgram/flux-tts:free` is a development candidate, not a production availability or multilingual guarantee. Validate the actual configured voice against the current catalogue instead of retaining an unverified hardcoded voice ID.

Implement the documented [speech endpoint](https://openrouter.ai/docs/api/api-reference/speech/create-audio-speech), including binary responses and requested formats. Validate [model capabilities](https://openrouter.ai/docs/guides/overview/models), [tool calling](https://openrouter.ai/docs/guides/features/tool-calling), [structured output](https://openrouter.ai/docs/guides/features/structured-outputs), and [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) separately. Fallback must preserve capabilities and privacy requirements; otherwise return unavailable. Prices, promotions, limits and catalogue availability are deployment configuration, not permanent product assumptions.

## 2. Current architecture and evidence

### 2.1 Review coverage

The source review traced extension capture/transfer, creation, editor state and controls, DOM editing, annotations, graph navigation, rendering, media, save/recovery, Java storage/authorization/publishing, AI/TTS, queues, analytics, local configuration, generated contracts and CI. Adjacent management, billing, dataset, integration and demo-hub surfaces were inventoried for dependencies.

This is an architectural source review, not certification that every production route or tenant/browser combination works. Phase 0 must complete route-level characterization and reproduce the risks below. Product implementation must not begin on an assumption that this planning exercise already completed Phase 0.

### 2.2 Existing pipeline and source map

Capture currently flows from Chrome DOM/frame snapshots, clicks and assets through extension storage/messages into IndexedDB, asset reconciliation and tour creation. React/Redux authoring writes screen edits, global edits, tour data and loader data through Java services to database rows and S3. Publication copies objects for the viewer. Jobs handle AI, speech, media, queues, analytics and integrations.

Paths below are repository-relative review entry points; follow their callers and consumers.

| Area | Entry points | Current responsibility |
| --- | --- | --- |
| Capture | `app/workspace/packages/ext-tour/src/{background,content,client_content,doc,msg}.ts` | Worker/session state, serialization, frames/shadow DOM, screenshots, cookies, transfer. |
| Creation | `app/workspace/packages/client/src/container/create-tour/` | Handoff, IndexedDB, uploads/assets, screens, theme and initial AI/manual content. |
| Editor/save | Client `src/container/tour-editor/`, `src/action/creator.ts` | Redux orchestration, local journal, separate write endpoints, acknowledgements and partial history. |
| Graph workspace | Client `src/component/tour-canvas/` | D3/SVG graph, screen/step organization, flows/branches/settings. This is not the proposed recorded-screen canvas. |
| Screen editing | Client `src/component/screen-editor/` | Raw DOM selection, AEP/FID targets, edit modes, annotation settings, image brushing and responsive anchors. |
| Rendering/edits | Client `src/component/screen-editor/utils/{deser,edits}.ts`, `src/component/base/hightligher-base.ts` | Deserialization, DOM mutation, highlighters, bounds, masking and layout. |
| Annotations | Client `src/component/annotation/`, `src/component/annotation-rich-text-editor/` | In-frame annotation roots, effects, inheritance, rich text, forms, media and navigation. |
| Graph/player | Client `src/entity-processor.ts`, `src/screen-adjacency-list.ts`, `src/container/player/`, preview components | Graph transformations, multi-annotation branches, rejoin/progress, frames, zoom and media. |
| Contracts | `app/workspace/packages/common/src/{types,demo-edit,tour-data-normalizer}.ts`, `llm-contract/`, `llm-fn-schema/` | Persisted types, normalization, one semantic operation, provider-shaped AI schemas. |
| API | `api/src/main/java/com/sharefable/api/` | Security/orgs, entities/screens, revisions, publication/assets, subscriptions/domains and analytics. |
| Jobs | `jobs/src/http/`, `processors/`, `main_msg_loop.ts`, `rt-relay.ts` | Providers, speech/transcoding, queues, integrations and analytics. |
| Adjacent product | Client `container/datasets`, `dh-editor`, `dh-qualification`, `integrations`, `billing`, `user-management`, `tours` | Schema, publication, identity, entitlement and permission consumers. |
| Advanced hub code | Client `component/demo-hub-editor/developer-tab/`, `utils.ts` | Hub-specific custom styles/scripts inserted into hub pages; distinct from tour annotation effects. |
| Build and tests | `.github/workflows/ci.yml`, workspace manifests, `jobs/package.json`, `api/pom.xml` | Pinned toolchains, generated types, local infrastructure and uneven test coverage. |

### 2.3 Preserve improvements already present

The previous plan incorrectly treats several foundations as absent:

- `ChunkSyncManager` now awaits acknowledgement, retains failed writes, retries with backoff, protects newer values from older acknowledgements, and exposes conflicts.
- API edit methods already use pessimistic row locks and `EditRevisionGuard`. The gaps are optional timestamp checks and object-store side effects that a DB rollback cannot undo.
- V2 normalization (`2026-08-31`) and legacy numeric/date versions exist. Evolution has started; it is not yet a complete document migration.
- Semantic plans/history exist, but the implemented operation is only `journey-option.set` for `hideModuleOnLoad`. Other editing behavior is not thereby migrated.
- AI context batch slicing was fixed in `action/ai-context.ts`; retain its regression coverage.
- Branch playback has valuable tests covering multiple annotations per screen and return behavior.

### 2.4 Verification performed

| Existing suite | Result |
| --- | --- |
| Common | 4 suites / 13 tests passed |
| Client | 11 suites / 72 tests passed |
| Extension | 2 suites / 14 tests passed |
| Jobs | 1 suite / 2 tests passed |
| Total | 18 suites / 101 tests passed |

Tests used installed dependencies on review-host Node 24.14.0, not pinned Node 22.23.2. Common/extension emitted the existing ts-jest/TypeScript compatibility warning. This does not certify a clean install or CI. API verification, full local-stack execution, production credentials and cross-browser E2E were not run for this rewrite.

The existing Playwright case visits `/__phase0/editor`, a development checkbox/localStorage fixture. It does not exercise the real editor, API, capture handoff, conflict or publication. Treat it as limited characterization, not end-to-end product coverage.

### 2.5 Evidence-driven risk register

“Observed” means present in source. A risk still needs controlled reproduction and deployment/permission inspection; no production incident is implied.

| ID | Finding | Required disposition |
| --- | --- | --- |
| F01 | Observed: extension clears finished capture/style data after sending, before durable client acknowledgement. | P0: restartable/idempotent acknowledged transfer and interruption tests. |
| F02 | Observed: `proxyAllAssets` can leave an outer promise unsettled; capture archive/speech PUT responses are not consistently checked. | P0: bounded failure propagation, verified uploads and recoverable creation. |
| F03 | Observed: broad cookie collection enters capture data. Risk: excessive credential retention/exposure. | P0: minimize scope, remove durable credentials and audit private storage/logs. |
| F04 | Observed: asset proxy has permissive TLS handling, credential forwarding, redirects and origin-keyed caching. Risk: SSRF or tenant cache contamination. | P0: isolated reproductions, valid TLS, destination/redirect controls, scoped credentials/cache. |
| F05 | Observed: API-key logging, broad AI request/error logging, prototype speech/WS routes and inconsistent auth boundaries. | P0: remove secrets from logs, audit callers/auth, remove unused prototypes. |
| F06 | Observed: blur/hide/mask primarily alter DOM/CSS; originals can remain in serialized data and edit tuples. | P0: safe publication/redaction remediation; P1: integrate with immutable compiler. |
| F07 | Observed: active processors reference Elastic Transcoder after its documented shutdown. | P0: restore existing media workflows with a supported bounded worker. |
| F08 | Observed: timestamp revisions are optional and screen/tour/global/loader writes are separate; S3 mutations are outside SQL rollback. | P0: characterize/recover failures. P1: complete atomic document protocol. |
| F09 | Observed: most editing/AI/media callbacks bypass semantic history. | P1: register and migrate every supported authoring writer. |
| F10 | Observed: normalizer reconstructs known root fields and can discard unrecognized metadata. | P0: preservation fixtures/fixes. P1: explicit version validation/migration. |
| F11 | Observed: text replacement can erase child markup; target skips and input attribute assumptions need characterization. | P0: reproduce nested/empty-input regressions. P2: explicit target capabilities/errors. |
| F12 | Observed: legacy zoom depends on navigation/voiceover events and separate transforms. | P2: shared camera and clock, with legacy behavior conversion. |
| F13 | Observed: duplicated provider-shaped contracts and schema generation that logs errors without failing. | P0: generation failure must fail CI. P1/P3: authoritative domain/provider boundaries. |
| F14 | Observed: jobs requires unrelated service keys; local auth/queue endpoints and third-party scripts are not uniformly isolated. | P0: local manual workflows with optional services and verified network isolation. |
| F15 | Observed: very large components mix selection, persistence, layout, graph, media and UI. | P0: stabilize/test seams; P1/P2: replace ownership boundaries without cosmetic rewrites. |
| F16 | Observed: publication copies multiple objects and shares source screens. Risk: partial snapshot and derivative/privacy leaks. | P0: failure/privacy safeguards. P1: immutable version compilation and reader migration. |
| F17 | Risk: worker redelivery, visibility expiry, swallowed errors and shutdown undermine effective job completion. | P0: processor-specific ack, retry, DLQ and idempotency tests. |
| F18 | Gap: real browser and API/jobs integration coverage is narrow. | P0: actual workflow baseline; extend in every phase. |
| F19 | Observed: image `responsive` represents fit-height/fit-width; tour responsiveness means layout behavior. | P2: explicit migration of layout, fit and mobile strategy without Boolean ambiguity. |
| F20 | Observed: hub custom scripts execute through dynamically inserted script elements. | P0: inventory/isolation review. P1: versioned hub config. P2: complete supported hook migration outside the authoring origin. |

AWS states Elastic Transcoder resources became inaccessible after November 13, 2025. This is a current dependency remediation, not speculative future cleanup. [AWS notice](https://docs.aws.amazon.com/elastictranscoder/latest/developerguide/updating-pipeline-status.html)

## 3. Target architecture and durable editing

### 3.1 Ownership

```text
Manual controls / creation / AI proposal
  -> versioned semantic plan + expected revision
  -> deterministic simulation and diff
  -> Java authorized command executor
  -> immutable draft objects + atomic DB pointer + outbox
  -> canonical document
       -> shared scene + editor controller
       -> graph player + camera/media clock
       -> publication compiler -> immutable public version

Jobs -> immutable generated asset -> conditional attachment command
AI   -> proposed supported operations -> review -> same commit path
```

Use a domain-only TypeScript package for types, schemas, pure preview reducers, graph/reference checks, migration helpers and diffs. It must have no browser globals, analytics initialization, network, provider SDKs or secrets. Extract it from common if common's dependencies prevent this boundary.

The Java API owns authentication, organization access, authoritative application of registered operations, revision checks, invariants and durable commits. Generate schemas/types and use shared golden fixtures to prove Java execution matches TypeScript preview. Do not imply Java directly runs TypeScript. Manual and AI edits use the same authoritative API, never two server implementations.

The renderer owns controlled content reconstruction, measurements, targets and scene primitives. The editor controller owns transient selection/modes/gestures. The player owns graph traversal and timing. Neither renderer nor controller calls feature-specific save endpoints. Jobs generate assets/results and attach them through scoped commands.

### 3.2 Canonical data model

Keep authoring schema, capture serialization, capture transfer, command contract, renderer protocol and publication format versions distinct. All entities have stable identities rather than array-index identity.

| Domain | Required contract |
| --- | --- |
| Document | Immutable demo ID, schema/capability version, organization, integer revision and metadata. |
| Screen | Immutable source reference, content kind, recorded dimensions, target index, frame/scroll context, layout/fitting policy and quality warnings. |
| Step | Stable ID, screen reference, annotation content/type, semantic target or fixed region, placement, scroll, styles, actions, camera and narration. |
| Graph | Flow entries/order, explicit continuation, branch entry/rejoin, chapters, completion/escape states and validated references. |
| Content edits | Typed target/scope operations. Private original/recovery values never enter public output. |
| Settings | Branding/inheritance, loader, journey/progress, frame/responsive behavior, playback, forms, personalization and approved advanced configuration. |
| Assets | Immutable ID/hash, MIME, dimensions/duration, readiness, provenance and generation fingerprint; mutable URLs are not identity. |

Preserve existing step `refId`, screen IDs, groups/flows, CTAs, form mappings, analytics identity and URL aliases through explicit maps. Duplicate creates new mutable entity/action identities while reusing immutable assets until edited. Do not duplicate a shared screen's edits merely because it is referenced by several steps.

Normalization is pure, idempotent and separate from validation. Preserve recognized extension metadata without activating unknown executable features. Unsupported future schemas are read-only with an upgrade message. Reading old content must not save migrations or generate audio.

### 3.3 Commands and history

Every operation specifies input schema, permission, scope, preconditions, affected IDs, deterministic result, diff, inverse/history behavior and publication impact. Families cover content, presentation, structure, privacy, forms/actions, media, loader/theme, responsive settings and supported advanced configuration.

Plan envelopes contain plan/operation IDs, demo ID, base revision, contract version, requested scope and dependency groups. Actor/organization come from authentication; `source: system` cannot confer authority. Validate nonempty/unique IDs, targets, value bounds, reference integrity, graph effects and allowed URLs/assets.

A gesture previews continuously and commits once on completion. Typing coalesces within a field session; composition and native text undo take precedence while editing text. Escape cancels transient work. Undo of a persisted action is a new validated revision, not rewinding a server pointer or overwriting concurrent edits.

An accepted AI plan is one history entry. Partial acceptance requires dependency closure and a recomputed valid preview; a branch and its necessary links cannot be split. A provider charge, sent webhook, published version or viewer event is not undone by editor history. Asset detachment and stale-result cancellation are reversible authoring actions; external side effects have separate lifecycles.

### 3.4 Commit protocol

Use immutable objects for large document content and the database as authority for draft revision/pointer.

1. Authenticate and check the idempotency record before rejecting an old expected revision. An authorized retry of an already committed ID/payload returns its recorded result. Otherwise load the trusted current revision, validate and apply registered commands.
2. Build/validate the complete candidate and upload immutable objects, checking response/checksum.
3. In a short DB transaction, lock/compare the expected revision, recheck idempotency under a unique database constraint, and commit the new pointer/integer revision, command result and outbox records.
4. If the revision changed during preparation, leave the current pointer untouched and return conflict. Collect unreferenced candidates later.
5. Return the durable revision and command ID. Repeating the same ID/payload returns the original result; reusing an ID with a different payload is rejected.

No distributed SQL/S3 atomicity is assumed. Object failure before pointer commit changes nothing visible. DB failure creates an orphan rather than a half-saved document. Outbox consumers remain idempotent even if the queue is configured for ordering.

Every writer must use this path: screen/global/tour/loader settings, metadata affecting playback, structure, creation, imports, AI, TTS attachments and publishing prerequisites. Service jobs get narrow permissions and the same revision validation. Enforce revisions; old clients receive an upgrade response rather than bypassing checks.

### 3.5 Recovery and concurrency

Replace ad hoc authoring journal keys with an IndexedDB command journal scoped to organization/demo/tab/session. Record IDs, base revision, payload, acknowledgement and conflict status. Coordinate tabs and handle account changes so one session cannot replay another tenant's edits.

Expose Saved, Saving, Offline with pending changes, Conflict and Save failed accurately. A request finishing is not evidence of a save. A matching acknowledgement clears only its own entry; newer edits survive. Lost acknowledgement is recovered using command ID, not a duplicate edit.

Reload restores acknowledged state plus valid pending commands. Storage denial/quota produces an explicit unsaved state and a recovery copy; it must not pretend durability. Conflicts offer rebase of nonconflicting operations, reload with retained recovery, or copy. A later keystroke cannot erase an unresolved conflict. Never silently last-write-win a structure or privacy change.

Define structured API errors for authentication, access, conflict, invalid plan, unavailable assets, rate limits and unavailable dependencies. Surface recoverable actions while preserving local work. Audit records exclude original sensitive content.

## 4. Rendering, geometry, and interaction design

### 4.1 Render isolation

Use a trusted renderer shell on an origin without application cookies. Inside it, reconstruct captured content in a script-disabled frame with a narrowly tested sandbox (baseline `allow-same-origin` without `allow-scripts`). The trusted shell can measure/manipulate its controlled capture document; captured scripts and inline handlers cannot execute. Fable's annotations, forms, media controls and content-editing inputs live in the trusted scene, outside the untrusted capture document. Provide separate local renderer origins as part of development infrastructure; do not weaken origin checks for local convenience.

The application communicates through a versioned RendererBridge. Validate message origin, window source, session nonce, demo/revision, schema and generation. The bridge exposes bounded hit testing, target measurement, scrolling, render updates and supported events; no arbitrary code execution or general DOM access API.

Sanitization and sandboxing are independent controls. Strip captured scripts, inline handlers, unsafe navigation/submissions, unsafe HTML/SVG attributes and unapproved network URLs. Rewrite asset references through owned storage. Test sanitizer configuration, updates after sanitization, nested templates, shadow roots, srcdoc and DOM clobbering. Do not enable captured scripts to fix an interaction regression.

This architecture requires an early feasibility fixture proving target selection, nested scrolling, safe reconstruction, form focus, font fidelity and cross-frame pointer behavior. If a browser API cannot support an intended interaction, implement the explicit trusted-scene alternative before migrating production controls. The experiment is a verification dependency, not permission for a second permanent renderer.

### 4.2 Unified scene and controller

The new scene owns selection outlines, hover highlights, handles, hotspots, annotations, privacy regions, camera focus regions and media placement. Accessible DOM/SVG are valid render primitives; no old component may independently inject an authoring highlighter or retain a raw selected element as its persisted identity.

Use a single transient state machine: idle -> hover/selected -> text editing, dragging, resizing, re-anchor or camera editing; plus preview/loading/error. Mode changes cancel or commit the active gesture consistently. Screen replacement/navigation invalidates stale selections and measurements. Escape first cancels the active action, then clears selection or exits preview.

Selection has an element list/inspector alternative for overlapped, clipped or hard-to-click targets. Nested targets support parent/child selection and overlap cycling. Direct text editing uses a trusted aligned editing surface; preserve safe inline structure or explicitly preview replacing the whole content. Browser-native text composition/selection works without propagating a drag to the scene.

### 4.3 Coordinate contract

Model source document/frame, scroll-container, scene, editor viewport CSS-pixel and raster device-pixel spaces separately. Persist geometry in source/target-relative units, never in workspace zoomed pixels.

One service composes nested frame offsets, container scroll, layout, authored camera, fit scale and editor pan/zoom. Pointer handling uses its inverse. Measurements include layout generation and clipping bounds. All selection, hotspot hit regions, annotation placement, privacy regions, camera and media consume this service.

Targets prefer stable capture IDs, with frame/shadow identity, semantic fingerprint and a saved fallback region. Resolution returns resolved, ambiguous, missing, clipped or unsupported and lists editable capabilities. Never silently accept the first approximate match. Re-anchor previews candidates and dependent changes. Image regions use normalized coordinates; reflowing HTML uses target-relative offsets and explicit variant anchors.

Batch measurement and invalidation after font/image readiness, edit reflow, scroll, resize and variant changes. Guard against detached frames, zero-sized elements, transformed ancestors, fractional pixels and stale async callbacks.

### 4.4 Layout, fitting, mobile and zoom

Separate these persisted concepts:

| Concept | Required behavior |
| --- | --- |
| HTML layout | Recorded layout by default; CSS-responsive reflow only when captured content supports it and author preview verifies anchors. No promise to reproduce JavaScript-only responsiveness. |
| Fit policy | Contain/fit-width and existing image fit-height equivalents with explicit aspect ratio, cropping/scroll and frame-border behavior. Preserve migrated choices. |
| Mobile presentation | Responsive variant when validated; otherwise fitted capture with readable trusted annotations and explicit viewer pan/zoom controls. A rotation suggestion is optional, not the only way to continue. |
| Viewer exploration | Manual zoom/pan may temporarily override the authored camera, with Reset focus. Preserve browser/page zoom and accessible controls. |
| Authored camera | Off, Automatic, Manual; source/target-relative focus, padding and transition settings. |
| Workspace viewport | Editor-only pan/zoom/fit. It never changes the authored camera or saved content scroll. |

The camera editor has a visible rectangle, dim surrounding area, drag/resize handles, numeric bounds, two-click creation, Fit, Reset, Copy and Done. Automatic derives a deterministic region from a valid target; missing/oversize targets fall back to Fit with a warning. Copying to a differently sized screen requires reprojection/validation.

Keep annotation text and controls readable when the capture zooms; define their scaling/collision policy consistently in editor and player. Camera transitions cannot hide a required form or CTA. Respect reduced motion; navigation cancels the previous camera/media transition.

Persist step-specific nested scroll state through Save current scroll position, Reset and automatic reveal. Preserve current auto/scroll/sticky semantics with explicit equivalents. Previewing or selecting a step must not accidentally save its current scroll.

### 4.5 Advanced capabilities

Convert named annotation/selection effects to declarative scene properties, preserving supported presets. Scope advanced tour CSS to captured content/named annotation roots and validate references. Do not replace complex unsupported HTML with a silent bitmap conversion.

Demo-hub custom CSS/scripts are a separate current feature. Inventory actual script uses, permissions and required hooks in P0. Preserve supported integrations through a versioned, constrained event/action SDK isolated from authoring credentials. Customization that requires unrestricted host DOM access needs an explicit supported replacement or owner-approved retirement before cutover. Private source can be retained for recovery, but there is no “open old editor” or “run legacy unsafe code” fallback.

## 5. Capability migration matrix

Every row is required. P1 migrates persistence for all currently supported changes; P2 replaces their interaction/rendering ownership. Later feature rows identify additional gates. Verification includes save/reload, undo/redo, preview and live/embed behavior where applicable.

### 5.1 Content and selection

| ID | Current behavior/dependency | Required replacement and edge cases | Gate |
| --- | --- | --- | --- |
| E01 | Raw DOM picker/highlighter modes. | Unified state machine; stable selection IDs; Escape, screen change, async render and canceled gestures handled. | P2 |
| E02 | AEP/FID and DOM bounds. | Bridge hit test, parent/child and overlap selection, frame/shadow identity, accessible target list and explicit unresolved state. | P2 |
| E03 | Text edits can replace child markup. | Direct supported text editing, structured preservation or explicit whole-content replacement; empty text, nested links, Unicode, RTL, paste and IME. | P2 |
| E04 | Placeholder/input value are separate edits. | Separate commands; empty-to-value/value-to-empty; never retain passwords or submit captured forms to the source app. | P2 |
| E05 | Image replacement/brush regions. | Upload/replace with aspect and fitting controls; SVG/background capabilities explicit; image-screen normalized regions and failed-upload recovery. | P2 |
| E06 | Local/global edits by path/FID. | Clear screen/selected-screens/demo scope; match preview/exclusions; avoid double-applying to shared screens or unrelated repeated text. | P2 |
| E07 | Blur/mask/hide primarily CSS. | Separate cosmetic blur, secure redaction, hide preserving space and layout removal, with public-byte privacy checks. | P0-P2 |
| E08 | Display removal reflows content. | Re-resolve dependent anchors, forms, camera and annotations; require intentional replacement for missing targets. | P2 |
| E09 | Image mask may leave source accessible. | Bake redacted derivatives, strip public originals and refresh thumbnails/variants. Explicit scope across shared assets. | P1/P2 |
| E10 | Direct edits bypass complete history. | Each operation has deterministic preview, logical history entry and reproducible saved result. | P1/P2 |

### 5.2 Annotations and engagement

| ID | Current behavior/dependency | Required replacement and edge cases | Gate |
| --- | --- | --- | --- |
| E11 | Lexical and annotation HTML. | Inline content/inspector, safe paste/links/variables, accessibility descriptions, multiline sizing and focus-scoped text shortcuts. | P2 |
| E12 | Element/main/default/cover annotations. | Explicit anchored, free-positioned and cover layouts, including no-target steps and empty states. | P2 |
| E13 | Hotspot-only/hideAnnotation, shapes, pulse and overlays. | Shared hotspot/card scene primitives, stack/hit priority, focus states, reduced motion and usable target size. | P2 |
| E14 | In-frame placement/size calculations. | Drag/resize, numeric/preset alternatives, clamping and collision rules; oversize content scrolls accessibly. | P2 |
| E15 | Separate hotspot re-selection mode. | Re-anchor previews target, placement and camera changes; Cancel restores prior state without save. | P2 |
| E16 | Referenced/inherited styles and style copy. | Theme/override/reset states; copy/paste style command; resolve dependents when inheritance source is deleted. | P2 |
| E17 | CSS presets affect selected/surrounding content. | Declarative scoped effects and validated advanced CSS; same scene ownership, no old highlighter. | P2 |
| E18 | CTA continuation/internal/external destinations. | Plain-language action editor, destination validation, same/new-tab behavior, safe protocols and origin attribution. | P2 |
| E19 | Required/optional/calculated/hidden form fields. | Focus, validation, submitted/error/retry states; preserve mappings; required input never auto-skips; deduplicated submit. | P2 |
| E20 | Upload/record/media bubble/voiceover controls. | Unified media panel and positioning; permission/cancel/retry/replace/remove; preserved formats and legacy assets. | P2/P3 |
| E21 | Auto/scroll/sticky adjustment. | Explicit reveal and saved nested scroll policy; selecting/previewing does not mutate it. | P2 |
| E22 | Desktop/mobile targets and frame settings. | Layout/fit/variant inspector and warnings; real capture dimensions; intentional missing-variant fallback. | P2 |
| E23 | Loader/global config have separate surfaces. | Reachable from workspace, same command/history/save contract and coherent loading/error behavior. | P1/P2 |

### 5.3 Structure and workspace

| ID | Current behavior/dependency | Required replacement and edge cases | Gate |
| --- | --- | --- | --- |
| E24 | D3 graph is the primary workspace. | Screen-centered editor, step strip and flow/chapter navigation. Optional graph overview uses the same selection/commands. | P2 |
| E25 | Multiple steps can share a screen. | Distinct step identity and navigation without duplicating shared content edits or flattening the graph. | P1/P2 |
| E26 | Reorder/delete/duplicate/group rewires references. | Atomic structure changes with inbound/outbound/rejoin/form/media review and click-based move controls. | P1/P2 |
| E27 | Screen picker/capture reuse. | Insert existing/upload/recapture at explicit location; screen replacement reports matched, ambiguous and missing targets before apply. | P2 |
| E28 | Journey flows and optional branches differ. | Visible main routes, optional detours and chapters, with destination/return controls. | P2 |
| E29 | Back/rejoin/progress depend on branch stacks. | Nested origins, reorder continuation, direct entry, hidden forms and finite cycles preserve intended progress. | P1/P2 |
| E30 | Runtime zoom tied to old events/narration. | Off/Automatic/Manual scene camera, complete visual authoring and identical viewer transforms. | P2 |
| E31 | Independent scaling/scroll calculations. | One geometry service, including nested frames, borders, browser zoom, DPR and resizing during gestures. | P2 |
| E32 | Workspace zoom and playback zoom are separate in code but unclear in UX. | Distinct workspace controls and Playback zoom mode; pan cannot accidentally save scroll or camera data. | P2 |
| E33 | Distributed keyboard handling. | Focus-scoped delete/duplicate/undo/redo/nudge/next/previous/Escape/preview, respecting input/browser/assistive shortcuts. | P2 |
| E34 | Pointer movement crosses iframe boundaries. | Capture/shield, cancel/lost capture and two-click/numeric alternatives; touch and pen behavior verified. | P2 |
| E35 | Preview depends on old editor orchestration. | Production player from current step/start against fixed revision; restore editor context; no production analytics/lead writes. | P1/P2 |
| E36 | Fragmented save/loading/error states. | Consistent missing target, unsupported capture, render failure, empty demo, offline, conflict and recovery states. | P0/P2 |

### 5.4 Dependent systems

| ID | Current behavior/dependency | Required result | Gate |
| --- | --- | --- | --- |
| E37 | Legacy isVideo/voiceover/media fields affect playback. | Explicit playback settings; data conversion only; no regeneration or changed defaults on read. | P2/P3 |
| E38 | Provider-shaped AI creation/edit routes. | Preserve existing AI through shared commands, then replace providers and add complete reviewed editing. | P1/P3/P4 |
| E39 | Viewer variables/datasets affect content. | Typed defaults/escaping, preview values, layout remeasurement and safe image variables; no viewer-time TTS. | P1-P3 |
| E40 | Publication combines separate objects. | One validated immutable version including edits, loader, media and privacy derivatives. | P1 |
| E41 | Live/embed modes differ in sizing/startup. | Same graph/scene, camera, forms and media across narrow frames, mobile and domains. | P2-P4 |
| E42 | Analytics depends on step/flow IDs and events. | Identity mapping, transition dedupe and explicit nonproduction preview mode. | P1/P2 |
| E43 | Hubs/qualification/share/thumbnails/integrations consume demos. | Migrate affected consumers in the originating phase; no broken downstream experience left for P5. | P1-P4 |
| E44 | Advanced effects and hub scripts have different scopes. | Supported scoped CSS and isolated hub hooks; every legacy use has a tested disposition. | P0-P2 |

## 6. Capture, playback, narration, and AI contracts

### 6.1 Capture and recapture

A capture session has an ID, transfer version, ordered screens, chunk IDs/checksums, expected count, completion marker and durable acknowledgement. The extension retains data until the client commits that exact complete session to IndexedDB. Duplicate/out-of-order chunks, reconnects and repeated completion are idempotent.

Recover from worker restart, tab close, page navigation, client reload, failed upload and storage quota. Show progress, quality warnings, per-screen asset failures and resume/discard actions. Optional asset/AI failure preserves usable capture. One-screen, no-click and image-only recordings must create manually.

Minimize credentials. Prefer authorized asset fetching within the extension. If server proxying is needed, use narrowly scoped short-lived credentials, validated destinations and private tenant-aware caches. Browser-wide cookies are not capture content and cannot enter archives, prompts, public data or logs.

Test open/closed shadow DOM limitations, adopted stylesheets, nested/cross-origin frames, CSS imports/relative URLs/base tags, fonts, SVG IDs/use, canvas/WebGL/tainted fallback, sticky/fixed content, nested scroll, virtualized lists, lazy assets, media posters, HTML4/quirks, restricted pages, rapid clicks and large sessions. Captures do not reproduce uncaptured dropdowns, offscreen virtualized rows or original backend behavior. Provide recapture/image fallback with honest limitations.

Replacing a screen is a versioned command: compare old/new, remap targets, list lost content edits/anchors/camera/form dependencies, allow explicit resolutions, regenerate derivatives, and preserve the old private revision for undo. Do not overwrite shared source assets in place.

### 6.2 Graph and player

Use one pure graph model and distinguish main-flow progress from optional-branch history. Preserve current regression scenarios: multiple annotations on one screen; A1 -> A2 -> B1 -> A3; nested detours; return to origin's next step; direct/cross-screen entry; continuation after reorder; inherited external CTA attribution; hidden-form skipping; absent journey data; and duplicate transition suppression.

Completion is explicit. Cycles cannot cause infinite traversal or progress; an optional terminal step cannot complete the parent. Back follows actual traversal history. Restart clears branch context. Missing destinations are author errors and block affected publication.

Every navigation source dispatches one transition: Next/Back, hotspot, CTA, form, menu, keyboard and narration end. Give transitions generation IDs; ignore late callbacks. Apply scroll, resolve target, set camera and annotation, then permit progression. Abort previous timers/media on navigation. Failed media cannot freeze manual controls.

### 6.3 Narration lifecycle

Persist enabled state, follow-annotation/custom script mode, language/voice preference, asset ID and generation fingerprint. States: disabled, missing, queued, generating, ready, stale, failed and canceled. Script/voice/language changes mark assets stale. An old asset can remain available for review but must not be labeled current.

Repeated identical generation reuses work. Attachment requires matching generation ID/input hash and an extant step. Delete, undo or later edit makes late results harmless. Retry individual failures. Global changes preserve custom overrides unless explicitly included.

New eligible steps default on after P3, but generation follows a visible creation/generation action; opening a demo or each keystroke cannot call a provider. Existing uploaded/recorded/generated audio remains playable. Publishing with enabled missing/stale audio requires fixing it or an explicit publish-without-narration choice recorded in the publication snapshot.

Provide Play/Pause, mute, replay, supported speed, transcript, and caption upload/edit support. For generated speech, include an accurate script transcript immediately. Timed captions require real provider timestamps or an implemented alignment pipeline; do not fabricate timings from text length and claim caption accuracy. A transcript is sufficient for audio-only narration; synchronized video requires appropriate captions before claiming accessibility support.

Only one media source/clock is active. Handle autoplay denial, slow assets, hidden tabs, rapid navigation, replay, mobile inline playback and reduced motion. Forms and branch choices cannot auto-progress. Respect explicit pause, and suspend timed progression while input is active. Optional reading-delay progression uses bounded per-step/default settings and remains subordinate to interaction requirements.

Unsupported speech languages use a validated configured alternative or explicit text-only behavior. Do not synthesize viewer-specific lead/personalization data during playback. Generic scripts or pre-generated author-approved variants keep publication deterministic.

### 6.4 AI creation and copilot

Creation accepts optional goal, audience, tone and desired length. It uses recorded interactions, safe product text, actual target capabilities and graph context to propose structure, copy, anchors, camera and narration. It cannot invent screens or unsupported product behavior.

Copilot scope is visible: current step, selected steps/flow or entire demo. Context contains current revision, stable IDs, safe content, relevant visuals and constraints. Captured text is untrusted data, not instructions. Exclude secrets, redacted originals and unrelated tenant data. Bound context size without losing cross-step references.

The workflow is propose -> validate -> simulate -> visual/text diff -> accept/reject -> atomic commit -> report acknowledged result. Simulated preview uses the same document/renderer as manual editing. Partial acceptance obeys dependency groups. Stale plans must revalidate and re-preview after concurrent edits.

Ask before editing is the required initial mode. Defer broad auto-apply. Tools cannot publish, change billing/credentials, send messages, delete an entire demo, execute unrestricted code or mutate arbitrary JSON/CSS. Unsupported intent gets a precise limitation and manual alternative.

Tools cover supported semantic content, presentation, graph, form/action, privacy, camera and narration operations. Assets must actually exist or be uploaded through the normal flow. Invented selectors, IDs or URLs are rejected. AI privacy suggestions remain reviewable candidates; deterministic delivery checks enforce explicit redactions.

Cancellation stops follow-up work and ignores late results. Requests have IDs, bounded retries/deadlines and preserved prompts/valid proposals. Evaluation must inspect persisted state, rendered results, unintended scope changes and recoverability across multiple trials.

## 7. Publication, privacy, and adjacent systems

### 7.1 Immutable publication

Publish takes an acknowledged draft revision. Save pending work first or explicitly choose an earlier saved revision. Compile source screens, edits, loader, settings, personalization defaults, media and derivatives into immutable versioned assets/manifest. Validate all references, privacy operations, readiness and runtime capabilities.

The exact same compiled snapshot powers publication preview and delivery. Advance the live pointer only after all required content exists. Concurrent publish uses expected live version/idempotency; failure leaves the previous version intact. Viewer sessions pin one manifest even if a newer version is published mid-session.

Preserve share URLs, custom domains, aliases and existing embed contracts. Thumbnails/metadata bind to publication version. Draft restore creates a new draft revision and does not publish. Rollback selects a retained validated version atomically. Late jobs cannot mutate published versions.

### 7.2 Privacy and asset access

Draft sources/history stay private. Public output contains only playback data. Redaction removes sensitive text, attributes, inputs, embedded data, old/new edit values, hidden DOM, sensitive alt/title/ARIA text, raw URLs and unredacted images from every reachable public artifact. Rebuild thumbnails, fallback images and variants; verify network responses and downloaded HTML/manifests.

Preserve layout with safe placeholders/derivatives. Review matching occurrences across screens and shared assets. A missing target or failed redaction derivative blocks publication; never silently downgrade to cosmetic blur.

Audit existing public objects separately. New safe output does not revoke old unsafe assets or CDN copies. Recompile/revoke affected published artifacts under an operational migration, preserve safe aliases, and verify access removal. Retention covers capture archives, draft revisions, AI logs, generated assets, publications and deletions.

### 7.3 Permissions, hubs, integrations and analytics

Authorize every authoring, capture, asset, job, publish/rollback and lead operation against organization/role. Enumerate public viewer routes separately. Jobs use scoped service identity. Presigned access is short-lived and object/operation scoped.

Keep non-AI subscriptions and entitlements. Hubs/qualification launch the correct publication and preserve form/CTA mappings. Personalization is typed/escaped, has defaults and safe image URLs, and triggers layout measurement without mutating publication. No secrets or private lead values in share URLs or logs.

Analytics includes publication/demo/step/flow/session identity and event deduplication. Preserve established report meanings and branch attribution. Draft/AI previews cannot write production analytics or real leads. Leads submit idempotently; integration delivery has mapping version, retry/DLQ and visible terminal failure without duplicate contact creation.

Rename, duplicate, move, delete and restore must account for links, assets, hubs, datasets, permissions, history, pending work and analytics retention. Deletion prevents late workers from resurrecting content. Migration does not silently reset reporting identity.

Offscreen embeds lazy-load and reserve dimensions. Use a poster/start surface where appropriate without loading every captured screen first. Preserve explicit user play and accessibility behavior; performance shortcuts cannot create a second reduced-function viewer.

## 8. Phase 0: review, stability, and foundation

**Implementation order:** P0 -> P1 -> P2 -> P3 -> P4 -> P5. Each phase inherits earlier guarantees. Split work into reviewable changes within a phase, but do not close a phase with unresolved dependent behavior moved to a later one.

**Purpose:** Leave the existing platform stable and understood before major architectural implementation. This phase contains audit, characterization, necessary reliability/security fixes, cleanup and development-foundation work. It does not introduce the new visual editor, broad copilot, new document architecture or new product categories.

**Current state and affected systems:** The core demo workflow in Section 2. Existing partial safety work is retained but does not satisfy the phase. The most urgent dependencies are capture -> creation -> save -> publish, source rendering/privacy, and media/jobs.

**Scope decision (September 5, user-directed):** Finish the main product before revising temporary billing or secondary features. Phase 0 acceptance covers capture, manual creation/import/duplication, current editing (including branches, forms, loader and responsive behavior), durable save/recovery, preview/player/embed, publication/privacy, and existing media processing. Retain the access protections already implemented because private drafts and workspace isolation protect these workflows.

**Redaction decision (September 5, user-directed):** Opaque blocks are the supported replacement for privacy blur. Capture the selected element's dimensions, remove protected serialized descendants and metadata from public output, retain reversible private authoring state, and preserve uploaded replacement masks without their original contents. Publication must reject unresolved or overlapping targets with a useful recovery message. Repair historical published snapshots with the same compiler and verified private backups. This choice does not waive source-image, thumbnail, proxy-asset or cache privacy requirements.

Further membership administration, seat/billing reconciliation and commercial-plan redesign are deferred. Standalone hub, dataset, custom-domain, analytics-dashboard and third-party integration expansion/qualification are also deferred; their existing code and passing regressions remain, and any shared dependency that breaks the core demo workflow remains in scope. The current billing setup is temporary: do not build a replacement billing architecture during Phase 0. Real provider replacement and new AI capabilities remain P3/P4. Record deferred work for later qualification rather than treating it as a Phase 0 blocker. This scope decision supersedes broader Phase 0 wording elsewhere in this document and older review checkpoints; it does not defer core security or data-loss defects.

**Public redaction behavior:** Published frames use compiled child trees without redundant `srcdoc` originals. Generated CSS content is resolved against the selected elements in their private frame/shadow scope before those elements are removed. Only identified protected values are removed from public CSS; unrelated text/icons and different values using the same custom-property name remain. Matching private values shared elsewhere are also removed, like shared protected image assets. Unresolvable generated-content selectors reject publication rather than silently blanking unrelated content. Private originals remain reversible. The [historical repair and republishing procedure](api/published-screen-migration.md) distinguishes legacy cleanup from selective publication.

### 8.1 Required work

| Workstream | Required work and evidence |
| --- | --- |
| Complete inventory | Enumerate core packages, routes, APIs, workers, persisted formats, feature flags, necessary access checks, storage objects and generated contracts. Trace every core authoring writer and every reader/derivative; record secondary integrations as dependencies or deferred surfaces. Record permission boundaries and ownership. |
| Behavior characterization | Exercise actual recording, manual/AI creation where configured, every current edit type, branches/forms/media, save/reload, publish and embeds using safe fixtures. Preserve existing secondary-surface regression coverage without expanding those products. Compare behavior with types/UI claims and this matrix. |
| Bug triage | Reproduce observed risks; record affected paths, input, expected/actual result, severity and regression test. Distinguish confirmed defects, environment failures, obsolete code and unverified risks. Fix blockers and important reliability defects before proceeding. |
| Capture transfer | Implement durable acknowledgement/session integrity, duplicate/restart handling, useful failure reporting and removal of fragile timer-based completion assumptions. Preserve legacy transfer only until supported extension/client versions are migrated. |
| Creation/uploads | Settle promises on success/failure, enforce timeouts/cancellation, verify PUT status/checksum, retain recoverable captures and provide retry without duplicate demos/assets. |
| Privacy/security | Minimize cookies, remove secret logging, fix auth/tenant checks, harden TLS/proxy/cache, sanitize rich text/captured content, and remediate unsafe public redaction behavior. Verify actual asset reachability rather than inferring it from bucket names. |
| Save stability | Extend existing journal/ack/conflict tests to current routes; fix confirmed data-loss behavior while preserving newer pending edits. Characterize independent screen/tour/loader transactions for P1. Do not advertise atomic multi-edit saves yet. |
| Media/queues | Remove the retired transcoder dependency; verify upload/transcode/playback end to end. Make processors idempotent and acknowledgements honest, with visibility renewal, bounded retry, DLQ and graceful shutdown. |
| Code health | Remove proven dead/duplicate code and expired flags; fix effect/listener/timer/object-URL leaks; separate fragile state/side-effect seams needed for tests. Avoid broad dependency or styling churn. |
| Contracts | Fail schema generation on errors, verify generated outputs are consistent, characterize legacy data and unknown-field preservation, and identify duplicated schemas for P1/P3. |
| Local development | Reproducible local MySQL/PostgreSQL/object storage/queue and seed data, a production-disabled local auth mode, optional integration modules and no mandatory unrelated cloud keys. |
| CI and diagnostics | Real product-route integration tests, deterministic fixtures, build/lint/type gates, useful redacted logs and baseline timing/memory metrics. Tests must fail when saves/uploads/jobs fail. |
| Advanced surfaces | Inventory current tour CSS/effects and separate secondary hub script dependencies. Retain the requirement for supported replacement hooks before their P2 migration; remove unused unsafe prototype routes only after checking callers. |

For existing media, use a pinned supported FFmpeg worker inside the jobs deployment, with resource/time/output limits, validated inputs, compatible MP4/WebM/HLS outputs and metadata. Preserve already-generated assets; never regenerate on read. Validate distribution/licensing for the deployment. This restores an existing feature without expanding into general video export. [FFmpeg format documentation](https://ffmpeg.org/ffmpeg-formats.html)

Local auth must require an explicit development profile and loopback/local deployment checks. Production must refuse to start with it enabled. Local manual workflows must not require Auth0, analytics collectors, billing, email, CRM, old AI provider or retired transcoder credentials. Stub optional services transparently; real AI provider validation belongs to P3. Verify this with outbound network observation, not configuration comments.

For privacy issues that cannot be safely remediated immediately, prevent the unsafe affected publication/action with an actionable recovery path. Such containment is not a completed capability migration: the complete supported replacement must land before P0 is accepted or the feature must be explicitly retired with its existing users/data accounted for.

### 8.2 Required fixtures and review outputs

Maintain a current-system inventory, issue/decision register, representative sanitized legacy demos, route/permission matrix, write/read dependency map, and baseline verification results. These support this specification; they must not define conflicting scope.

Characterize at least: empty/one-screen demos, multi-annotation screens, nested optional branches, cover/hotspot/form steps, shared/global edits, HTML/image/media screens, style inheritance, responsive and fixed layouts, nested scrolling/frames, missing assets/targets, narration on/off, drafts/published versions. Dataset personalization already used by a core demo must keep working; full standalone dataset, hub and custom-domain qualification is deferred.

Measure actual capture/import/editor/player/publish behavior before selecting optimization work. A bounded isolated experiment may validate render sandbox and geometry feasibility; it must not start a production editor migration during P0.

### 8.3 Phase 0 completion gate

All are required:

1. Every core subsystem and current core authoring mutation has an identified owner, source path, data dependency and verification case.
2. No unresolved critical/high-severity security, data-loss or broken-core-workflow issue remains. Lesser issues have explicit impact and cannot block later architecture.
3. Actual extension-to-client capture survives interruption/duplicate delivery and completes manual creation without external services.
4. Current important editing, branches, forms, media, save/reload and publication behavior is tested through real routes; existing regression suites still pass.
5. Media processing no longer calls Elastic Transcoder. Failed uploads/jobs cannot report success or drop recoverable work.
6. Clean pinned-toolchain build/lint/tests and local bootstrap succeed; schema generation failures fail the build.
7. Sanitization, credential handling, proxy boundaries and current public privacy output pass adversarial fixtures.
8. Removed code/flags/routes have verified caller/consumer absence. Remaining debt has a concrete later-phase disposition.
9. No major refactor has been marked complete under the label “foundation.”

**Risks:** scope expanding into a rewrite, false confidence from mocks, and deleting apparently unused customer-dependent behavior. Control them with the inventory, reproductions and narrow tested fixes.

## 9. Phase 1: complete document and persistence migration

**Purpose:** Make every current supported authoring action durable and coherent before changing the editor experience.

**Why/current behavior:** Data is split among tour, screen, global, loader and entity-property writes. Acknowledgements and locks exist, but timestamp revisions, multiple transactions and mutable objects cannot guarantee an atomic cross-feature plan. Semantic history covers one option.

**Entry:** P0 accepted; writer/reader inventory, current behavior fixtures and supported legacy schema catalogue complete.

### 9.1 Build and integrate

1. Implement Section 3's canonical document, schemas, complete current-operation registry and TypeScript/Java conformance tests.
2. Add database revisions, immutable document objects, idempotency records, authorized command execution, outbox and recovery journal. Define safe object retention/orphan cleanup.
3. Route every existing tour editor, loader/settings, creation/import, AI and media attachment writer through commands. Existing UI may remain during this phase, but it has one new persistence model throughout.
4. Migrate all readers: editor, viewer, jobs/cached data, publication preview, thumbnails, hubs, dataset/personalization consumers, API serialization and generated contracts.
5. Implement immutable publication/rollback, privacy compilation and draft/public separation from Section 7. This cannot be postponed until release hardening.
6. Give hub configuration its own versioned aggregate using the same persistence protocol, with references to demo publications. Do not force billing or independent organization settings into a demo transaction.
7. Add complete history for current actions, grouping/coalescing, reload recovery and conflict UX. Rebase only operations whose preconditions still hold.
8. Migrate active data through resumable, dry-run-capable tooling. Preserve identifiers, extension metadata, source objects and safe public URLs; create reports for unresolved references and required manual resolutions.

### 9.2 Migration/removal

Upgrade all current client/job callers before making expected revision mandatory. Migrate pending local journals with their base revision; never discard unacknowledged entries. Backfill drafts and published manifests, verify hashes/rendered fixtures, then disable old mutation endpoints or return a clear upgrade error.

Retire direct screen/global/tour/loader persistence as authoritative write paths, optional revision bypass, mutable published-data assembly and duplicate command definitions. Legacy data import/normalization may remain as an explicitly supported read boundary for historical data; it must output the canonical model and cannot invoke old editors or writers.

A P1 release is the existing complete UI on a fully migrated persistence system. It is not an early release of half the new editor.

### 9.3 Edge cases and risks

Test two tabs/users, lost acknowledgement after commit, timestamp collisions in migration inputs, a new edit during save, conflict followed by typing, partial object upload, SQL failure, idempotency reuse with different payload, expired auth, tenant switch, quota exhaustion, duplicate jobs, stale attachment, read-only future schema, broken inherited references and concurrent publish.

Cross-language reducer divergence and large-document commit cost are primary engineering risks. Use golden operation traces, incremental immutable asset reuse, bounded payloads and measured latency. Do not solve conflict by silently accepting whole-document last-write-wins.

### 9.4 Phase 1 completion gate

- All existing supported mutation families, not just one option, use registered operations and mandatory integer revisions.
- Every accepted plan is all-or-nothing at the draft pointer and recoverable after reload; repeated requests do not duplicate state.
- Manual and existing AI operations have identical semantic results and history.
- Private sources/history are absent from public artifacts; exact publication preview matches live/embed snapshot.
- All current consumers read the canonical model, with no skipped hubs/media/settings paths.
- Legacy fixtures preserve graph/CTA/form/identity/branding/playback behavior; unknown fields are handled deliberately.
- Old authoring write endpoints and mutable publication routes are no longer usable.
- Fault-injected storage, DB, browser and queue tests prove recovery; a real browser/API edit-to-publish workflow passes.

## 10. Phase 2: complete visual editor and player scene

**Purpose:** Replace fragmented authoring with one screen-centered workspace, including zoom, responsive behavior, graph editing and all viewer integrations.

**Why/current behavior:** The D3 graph workspace, raw DOM picker, annotation lifecycle roots, image brush and separate zoom transforms divide interaction ownership. Source HTML is reusable; those authoring controllers are not.

**Entry:** P1 accepted. The complete E01-E44 inventory has a replacement for each existing behavior. The render-isolation/geometry feasibility fixture proves the hardest cases before mass component conversion.

### 10.1 Build and integrate

1. Deliver the scene, RendererBridge, coordinate/target resolver and input state machine in Section 4. Integrate controlled source reconstruction and privacy-aware derivatives.
2. Build the primary workspace: step/flow/chapter navigation, recorded-screen center, contextual toolbar/inspector, clear save status, undo/redo, preview and publish access.
3. Implement every applicable matrix row, including advanced settings, loaders, forms, images, global edits, style inheritance, re-anchor, scroll policies and media controls.
4. Implement camera Off/Automatic/Manual and all drag/click/keyboard alternatives as part of the same scene. Replace the old voiceover-linked zoom and position events.
5. Implement explicit layout/fitting/mobile policies, readable trusted controls and variant anchors. Translate legacy responsive flags by meaning, not field name.
6. Move flow/branch/CTA editing to the canonical graph and pure player traversal. Keep a graph overview only as a view of the same model.
7. Integrate player preview/live/embed, responsive frames, forms, personalization, thumbnails, analytics and hub launches. Remove production analytics side effects from all author previews.
8. Migrate current named effects/CSS and supported hub-script hooks, with isolation and regression tests. Unsupported legacy customization must be resolved before cutover.
9. Profile bounded rendering/preloading, measurement batching, listener cleanup, cancellation and memory while developing; do not defer core responsiveness to P5.

### 10.2 Replacement UX requirements

First click selects; a clear edit action enters text editing. Handles and a contextual inspector explain what is editable. Dragging commits once; Escape reverts the gesture. Numeric size/position and click-to-move controls provide alternatives. Selection, hover, focused and disabled states are visually distinct and not color-only.

Structural deletion shows affected destinations/rejoins/inheritance and offers a valid reconnect proposal. Recapture shows old/new and target migration status. An inaccessible target provides a concrete re-anchor/region/fallback choice. Changing screens cannot silently save partial text or leave invisible active modes.

Preview from the selected step and from start uses the production player. Leaving preview restores the workspace viewport and selection. Pending render/save/generation failures remain visible without blocking unaffected editing.

### 10.3 Removal and migration

Replace uses of old authoring `tour-canvas` orchestration, `screen-editor` selection controllers, `dom-element-picker`, `screen-image-brushing`, direct highlighter injection and legacy zoom events. Some files contain reusable rendering/player utilities: extract those responsibilities into the new modules first, then delete the obsolete controllers. Renaming an old component is not migration.

Convert legacy geometry/camera/scroll data and ensure historical publication previews normalize into the new runtime. At completion, no current route, mobile mode, feature flag or missing-capability fallback can select the old editing model. All active supported demos and their viewer paths run on the new scene architecture.

### 10.4 Edge cases and risks

Resolve nested/cross-origin frame representation, shadow paths, transformed/clipped elements, CSS reflow, font swaps, browser zoom/DPR, reduced motion, oversize annotations, overlapping hotspots, canceled pointers, text IME, dynamic variables, image fitting, missing targets, mobile pan versus page scroll, and media/camera race conditions.

A script-disabled capture may not reproduce arbitrary original app behavior. Reproduce intended demo interactions through trusted scene controls and recorded states; do not re-enable source scripts. If a replacement cannot meet a supported capability, the phase remains incomplete.

### 10.5 Phase 2 completion gate

- E01-E36 and all applicable cross-system rows have behavioral, persistence and viewer evidence.
- Selection, highlighting, text/image/privacy edits, annotation controls, layout, scroll, camera and media share one scene/geometry system.
- The same step looks and behaves consistently in author preview, publication preview, live, embed, mobile and hub launch.
- Every existing branch/rejoin/progress regression passes in the new runtime.
- Undo/redo/reload reproduce complete geometry and graph changes; no screen/global/advanced write bypass remains.
- Keyboard, screen reader, touch and non-drag alternatives work for supported actions.
- Legacy effects/customization and old demo data have tested replacements; no unsupported active customer capability is silently dropped.
- Old authoring routes/controllers/flags/event dependencies are deleted or demonstrably unreachable with their removal finished in this phase.

## 11. Phase 3: providers, creation, and narration

**Purpose:** Replace provider/credit coupling and deliver a complete AI/manual creation and narration experience on the new editor.

**Why/current behavior:** Jobs uses Anthropic/OpenAI-shaped contracts, hardcoded models, credit deductions and fragile uploads. Creation and voiceover are distributed across client/jobs/API and media compatibility fields.

**Entry:** P2 accepted; operation registry includes current content/media actions, and the new scene/player works without AI. Supported media processing already works from P0.

### 11.1 Build and integrate

1. Define provider-neutral LLM and speech interfaces, typed requests/results/errors, capability negotiation, deadlines/cancellation, privacy routing and bounded retry.
2. Implement OpenRouter adapters using validated deployment configuration. Separate model availability, provider capability and product entitlement. Mock adapters cover deterministic local/CI failures.
3. Replace existing creation/edit/TTS calls end to end. Remove runtime dependence on old provider keys, SDK types and duplicated prompt/tool schemas; retain historical asset/provenance data.
4. Remove AI balance displays, purchase/upgrade prompts, client checks, server enforcement, deductions, defaults and tests from every AI/TTS entry point. Preserve unrelated billing. Historical financial/audit records may remain inert under retention policy.
5. Provide Create Manually / Create with AI with visible capture readiness and narration default. Both create the same document; cancellation/failure preserves the capture and allows manual continuation.
6. Implement Section 6.3's full narration state machine, script/voice controls, per-step/global inheritance, preview, generation, retry/cancel, asset attachment, undo and stale-state handling.
7. Handle transcripts, caption inputs and optional accurate timed-caption support explicitly. Do not make successful TTS dependent on unsupported provider timestamp output.
8. Integrate narration into current-step preview, camera timing, playback controls, forms/choices, publication snapshots, caching and mobile/embed behavior.
9. Ship local configuration and capability diagnostics. Manual local operation remains available with no provider key. Configured real AI/TTS uses OpenRouter only; unrelated services stay optional.

### 11.2 Edge cases and migration

Test unsupported tools/voice/language, empty scripts, malformed model output, non-audio success responses, format/MIME mismatch, authentication failure, rate limits, provider timeout/outage, duplicate generation, multi-step partial generation, deleted/reordered steps, global voice change with overrides, stale jobs and publication while generation is pending.

Preserve old demos' narration state and old MP4/WebM/HLS/audio assets. Convert `isVideo`/voiceover compatibility fields deliberately; missing versus null values cannot accidentally enable narration. No regeneration on read or migration. No secret/provider payload leakage through errors.

### 11.3 Phase 3 completion gate

- Existing AI creation/editing still works through the semantic command path after provider replacement.
- No executable AI credit gate/deduction or obsolete provider requirement remains in any normal or alternate entry point.
- Fresh manual and AI creations converge on the same valid editable document and publish successfully.
- New narration defaults are explicit; existing settings/assets are preserved.
- Every generation state has a usable UI/recovery path; stale/duplicate workers cannot attach incorrect audio.
- Narration and camera remain synchronized through navigation/replay/pause; forms/choices and autoplay restrictions are respected.
- Live/embed/mobile work without runtime provider calls, and publication is independent of future generation results.
- Capability, authorization, storage, privacy and failure tests pass, including real bounded provider smoke tests with sanitized fixtures.
- Local manual operation needs no external dependency; real configured local AI/TTS needs only OpenRouter.

## 12. Phase 4: grounded creation and reviewed copilot

**Purpose:** Extend AI from existing narrow generation into reliable end-to-end semantic editing.

**Why/current behavior:** Current prompts/tools cover limited content operations and do not constitute a complete scope-aware, visually previewable command assistant.

**Entry:** P3 accepted. Manual operations and narration already work completely; AI must not become the only way to access a capability.

### 12.1 Build and integrate

1. Build context from the canonical revision, safe target index, graph/flow relationships, current selection, relevant screen visuals and project constraints.
2. Define goal-based creation and editing workflows over the existing operation registry. Keep model output as a proposal; server execution validates every operation again.
3. Add scoped copilot UI with plan summary, per-step visual/text changes, dependency-group selection, warnings, accept/reject and history linkage.
4. Implement stale-plan detection, revalidation/re-preview, cancellation, bounded multi-call orchestration and preserved failed/retry state.
5. Cover content/tone/translation, structure/chapters, actions/forms, theme, target/camera, narration and privacy proposals when supported. Report precise unsupported capabilities instead of invented modifications.
6. Preserve current creation behavior, add grounded first-draft organization, and avoid invented facts/screens. No automatic publication or provider-triggered raw document writes.
7. Evaluate actual committed state and rendered result; run the same outcome checks for equivalent manual/AI plans.

### 12.2 Evaluation and failure cases

Create a versioned set of at least 60 realistic tasks, with at least 20 covering adversarial/failure/ambiguity cases and all enabled tool families represented. Run at least three trials per task against each candidate deployment configuration. Include held-out cases; do not optimize only for exact fixture wording.

Deterministic checks cover authorization, scope, valid IDs, graph invariants, atomicity, redaction, stale results and persisted outcomes. Human review scores instruction fulfillment, truthful product copy, visual quality and useful explanations. Model judges can assist but cannot overrule hard invariants.

Include duplicate labels, ambiguous anchor requests, impossible screen requests, multilingual/RTL text, large demos, global/selected scope, untrusted captured instructions, malformed tool output, prompt requests for unsupported code, concurrent human edits and partially accepted dependencies.

### 12.3 Phase 4 completion gate

- Every advertised AI operation has a working manual counterpart and the same authoritative command implementation.
- Nothing modifies the draft before acceptance; visual preview and saved result agree.
- All deterministic safety/integrity checks pass in every trial; invalid output is rejected without partial state changes.
- At least 90% of ordinary supported tasks meet the agreed task-outcome rubric across trials, with no advertised tool family below 80%. These are product release targets, not observed baseline results.
- Any failed task class is fixed or explicitly removed from advertised scope with a usable alternative; averages cannot conceal a broken capability.
- Multi-step changes are undoable/recoverable, stale plans cannot overwrite work, and cancellation/provider failure leaves a usable editor.
- Real model evaluations and regression fixtures pass for the deployed model/provider/privacy configuration.
- Published/live/embed results of accepted plans behave correctly and contain no private context or provider metadata.

## 13. Phase 5: production qualification and rollout

**Purpose:** Prove the completed product works under realistic load, browsers, tenant data and operational failure. This phase validates and tunes complete features; it does not finish deliberately omitted earlier integrations.

**Entry:** P0-P4 gates accepted, active data migrated, and deprecated production paths removed.

### 13.1 Required work

**Deferred from Phase 0 by user direction:** Revisit membership administration, legacy inactive-owner recovery, seat reconciliation and the temporary billing model before commercial rollout. Qualify standalone hubs, datasets, custom domains, analytics dashboards and integrations when those surfaces are revised. Define their product/permission/migration requirements before implementation; retain existing core access protections and do not make core creation/editing/playback depend on an unavailable billing provider.


- Run the full fixture matrix in Chromium, Firefox and WebKit; validate actual iOS Safari and Android Chrome for viewer/media/touch behavior. Extension capture targets supported Chrome versions.
- Conduct keyboard/screen-reader/non-drag accessibility review and author usability sessions. Verify readable small embeds, 200% zoom, RTL, focus restoration and reduced motion.
- Profile realistic and large captures, bounded preload, memory, layout invalidation, storage/commit/publication and worker throughput.
- Exercise network partitions, lost acknowledgements, DB/object/queue/provider failure, worker restarts, deployment interruption, partial migration, expired auth and permission revocation.
- Verify isolated capture rendering, proxy/asset authorization, tenant boundaries, public redaction, legacy object access removal and log retention.
- Prove all adjacent management/hub/personalization/domain/billing/integration workflows remain coherent.
- Deliver redacted operational dashboards, alerts, incident/recovery procedures, backup/restore and migration reports.
- Roll out to internal fixtures, a controlled customer cohort, then general availability. Predefine stop/rollback criteria and validate the rollback reader can consume all data written by the candidate release.

### 13.2 Completion gate

All gates in Section 14 pass, no critical/high issue remains, every active supported capability has a complete new path, and operational owners can recover a failed deployment without data loss or restoring a deprecated authoring dependency.

## 14. Verification, migration, retirement, and completion

### 14.1 Required evidence by layer

| Layer | Evidence required |
| --- | --- |
| Pure domain | Operation preconditions/inverses, graph invariants, target scope, normalization idempotence and unknown-field rules; property-based traces where useful. |
| Cross-language contract | Golden command traces produce equivalent TypeScript preview and Java committed documents; generated schema drift fails CI. |
| API/storage | Real database/object-store tests for auth, revisions, idempotency, failure before/after commit, publication pointer and access control. |
| Extension/creation | Actual extension transfer to client with restart, reordered/duplicate chunks, durable ack, failed upload and manual/AI recovery. |
| Renderer/controller | Layout/target/geometry fixtures including nested frames, scroll, fonts, clipping, images, responsive variants and malicious content. |
| Player | Every graph/navigation/media/form source plus generation cancellation, mobile/embed and exact publication behavior. |
| AI | Deterministic mock failures and multi-trial real-provider tasks scored on actual final state, scope and human-visible quality. |
| Browser E2E | Real authoring routes and backend: capture/import -> edit -> undo/redo -> reload -> preview -> publish -> viewer/lead/analytics. The checkbox fixture is insufficient. |
| Operations | Duplicate/redelivered jobs, graceful shutdown, DLQ recovery, migration restart, backup restore, rollback and public-object revocation. |

Do not replace meaningful integration checks with tests that merely repeat implementation logic. Each confirmed regression gets a focused test; each architecture boundary gets representative fault injection and end-to-end evidence.

### 14.2 Fixture catalogue

Maintain versioned fixtures for numeric/date legacy schemas, V2 and new schema; multi-step-per-screen and nested branches; inherited styles/CTAs; blank/default/cover/hotspot/form steps; hidden forms and cyclic graphs; global/local/FID/path edits; fixed/reflow/mobile layouts; HTML4; shadow and nested frames; image fitting/redaction; slow/missing assets; old/current narration; personalization; hubs and qualified routes; unpublished/published/restored/deleted content.

Fixtures must include small, typical and large documents. Use sanitized synthetic or approved redacted data, never copied credentials or production leads. Preserve baseline screenshots and behavioral assertions separately: visual similarity cannot prove navigation or privacy.

### 14.3 Quality targets

These are initial release gates to be measured, not claims that the current product meets them. P0 records the exact benchmark hardware/network and representative asset sizes; changes to a target require a documented reason before implementation, not a retroactive waiver.

| Area | Target |
| --- | --- |
| Data integrity | Zero lost acknowledged edits or partial accepted plans in fault-injection/concurrency runs. |
| Publication | Zero mixed-version reads or private/redacted original leaks in the supported fixture catalogue. |
| Interaction | Warm local selection/input feedback p95 <= 100 ms; cached step transition p95 <= 300 ms on the agreed desktop fixture. |
| Gesture rendering | Meet a 16.7 ms frame budget on the reference desktop for normal drag/pan; low-end mobile has no sustained input lockups and exposes reduced motion. |
| Geometry | Overlay/hit-region agreement within 2 CSS pixels on fixed-layout fixtures after scroll/zoom/resize; reflow fixtures resolve the correct semantic target. |
| Save | Typical text/geometry command acknowledgement p95 <= 1 second against local/staging reference stack, excluding new asset upload; errors remain immediately visible. |
| Viewer load | A typical 20-step demo reaches usable first-step controls within 3 seconds on the agreed throttled profile; no need to download all steps first. |
| Scale | Test at 1, 20, 100 and 200 steps, including shared screens and large DOMs. Bound live frames and preload. Larger existing demos get measured migration disposition, not silent truncation. |
| Memory | Repeated navigation/edit/preview cycles plateau after cleanup; no steadily retained detached frames, roots, listeners or object URLs. |
| Accessibility | Fable-authored controls target WCAG 2.2 AA; keyboard, focus, non-drag alternatives, adequate target size/contrast and relevant transcripts/captions verified manually and automatically. |
| AI | P4 integrity gates and outcome rubric pass on the exact deployed configuration; no success claim before durable acknowledgement. |

Captured application content may itself be inaccessible; do not claim automatic compliance for arbitrary captured apps. Provide authored descriptions, trusted navigation and intentional accessible alternatives. Interactive controls cannot rely solely on the accessibility tree of captured source content.

Enforce explicit document/asset/operation limits from measured capacity. Oversize inputs return an actionable validation/recovery path. Default preload is current and next likely screen, with stricter mobile memory bounds; do not preload every branch or retain all iframes.

### 14.4 Current verification commands

Use the pinned toolchain: Node 22.23.2, Yarn 1.22.22 for the workspace, npm 10.9.8 for jobs, and Java 17. The existing CI definitions are the command baseline, not proof that they have run successfully for a future change.

From `app/workspace`:

```sh
yarn install --frozen-lockfile
yarn workspace @fable/common build
yarn workspace @fable/common lint
yarn workspace @fable/client lint
yarn workspace @fable/ext-tour lint
yarn workspace @fable/common test --runInBand
yarn workspace @fable/client test --watchAll=false --runInBand
yarn workspace @fable/ext-tour test --runInBand
yarn test:e2e:install --with-deps
yarn test:e2e
yarn workspace @fable/ext-tour build-local
yarn workspace @fable/client build-staging
```

Set CI appropriately for noninteractive tests as in the workflow. The browser suite must be expanded to real product paths and additional browsers; its current command alone does not establish that coverage.

From `jobs`: `npm ci`, `npm run lint`, `npm test -- --runInBand`, `npm run build`, and the production Docker build. From `api`: Maven-wrapper `verify` under Java 17, using `mvnw.cmd` on Windows or `bash ./mvnw` in CI. Verify `api/gen/api-contract.d.ts` and downstream generated copies are consistent. Add the contract/storage/queue/provider checks required above as those boundaries are implemented.

### 14.5 Migration protocol

For each schema/storage/render migration:

1. Inventory active drafts, publications, historical versions, pending journals/jobs and downstream references.
2. Run a dry-run conversion with counts, hashes, reference checks and unsupported-data reports.
3. Deploy compatible readers first; block incompatible old writers with an actionable upgrade path.
4. Convert in resumable idempotent batches with checkpoints, preserving immutable originals privately under retention policy.
5. Compare behavioral/visual fixtures and real sampled records; resolve every active incompatible capability.
6. Switch authoritative pointers/callers only when the new path is complete.
7. Verify all consumers and public access paths; remove old writers/controllers/flags and unsafe obsolete objects.
8. Prove backup restoration and application rollback against data already written by the new release.

Read compatibility for intentionally retained historical data is a documented import/normalization contract, not an alternative editing architecture. It cannot permit new writes to obsolete schemas or route users into old controls.

During a phase, temporary flags/adapters must have a named purpose, owner, removal condition and expiry within that phase. A phase cannot close while its temporary compatibility path remains necessary. Rollback means a tested compatible release or publication pointer, not reactivating an old writer that corrupts new data.

### 14.6 Retirement ledger

| Retired responsibility | Replacement | Retirement gate |
| --- | --- | --- |
| Timer-based capture handoff and premature storage cleanup | Session/checksum/durable acknowledgement protocol | P0 |
| Retired transcoder and unused realtime/sample provider paths | Supported media worker; only authenticated required provider routes | P0 |
| Optional revision bypass and independent authoring save endpoints | Canonical command executor and integer revisions | P1 |
| Mutable piecemeal public assembly | Immutable compiler/manifest/live pointer | P1 |
| Direct AI/media document mutation | Reviewed commands and conditional asset attachment | P1, extended P3/P4 |
| Old picker/brush/highlighter authoring controllers | Shared target resolver, scene and input state machine | P2 |
| Voiceover-linked legacy zoom/events | Explicit camera and unified transition clock | P2 |
| Old editor route/feature-flag fallbacks | Complete new workspace for all supported capabilities | P2 |
| Unrestricted hub scripts in authoring context | Supported isolated SDK hooks and scoped configuration | P2 |
| Runtime Anthropic/OpenAI coupling and AI credit gates | Provider-neutral OpenRouter adapters and server usage controls | P3 |
| Duplicated provider-specific AI tools/write paths | Domain-backed validated proposal registry | P3/P4 |

Retirement evidence includes repository searches, import/caller graphs, endpoint/route tests and runtime traces. Merely hiding UI or renaming a file does not count. Reusable render/domain functions may move; obsolete ownership must disappear.

### 14.7 Operational readiness and ownership

Assign accountable roles before each phase starts: product/UX for replacement behavior, frontend for scene/controller/player, backend for commands/publication/auth, jobs/platform for providers/media/queues, and quality/security for independent verification. One phase owner owns the integrated gate; separate component sign-offs cannot substitute for it.

Track capture success/recovery, time to first usable draft, save latency/failure/conflict/recovery, missing targets, render errors, publication success/duration, viewer navigation/media failures, lead/integration outcomes, AI validity/acceptance/undo, job retries/DLQ and provider spend. Correlate by safe request/demo/revision IDs. Do not log cookies, keys, raw sensitive captures, prompts or lead data by default.

Before rollout, provide restoration procedures for DB/object pointers, queue recovery, stale-generation cleanup, privacy revocation and migration restart. Alert on actionable failures with ownership. Establish backup frequency and verify restoration time against the deployment's agreed recovery objectives.

### 14.8 Definition of complete

The program is complete only when:

- Every retained capability has a coherent manual workflow and every advertised AI capability has equivalent safe semantic behavior.
- Capture, editor, camera, narration, branching, forms, personalization, publication, embeds, hubs and analytics agree on document identity and behavior.
- All changes are durably recoverable; publication is immutable and privacy-safe.
- Active supported legacy content works through the new architecture, with no unresolved migration queue hidden behind an old editor.
- Temporary adapters, duplicate writers, retired provider requirements and deprecated authoring controllers are removed.
- Failure, accessibility, browser, performance and operational gates are evidenced.
- Known limitations are explicit product behavior with usable alternatives, not unfinished implementations described as future polish.

When new work is discovered, either complete it within the owning phase or revise this specification with its full dependency and migration consequences. Do not declare a phase complete while moving its missing end-to-end behavior into an unspecified future task.
