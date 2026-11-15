# TEST_READY: LUNA.FM Discover Page, Full Player Pop-Up & Minimized Island Verification Suite

## Status: READY FOR WORKER IMPLEMENTATION & E2E VERIFICATION
- **Suite File**: `scripts/verify-discover.mjs`
- **Location**: `c:\Users\krishna negi\OneDrive\Desktop\Lunafm\luna-fm2\scripts\verify-discover.mjs`
- **Test Count**: 115 comprehensive, requirement-driven automated test cases
- **Execution Engine**: Node.js ESM (Node.js v24+ compatible)
- **Suite Architecture**: 4-Tier Opaque-Box Acceptance Architecture with progressive milestone evaluation

---

## 1. Executive Summary

The acceptance and verification test suite `scripts/verify-discover.mjs` has been designed, authored, and validated in strict accordance with `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, and the Survey 3 findings. It provides 100% automated coverage of all 12 acceptance criteria, plus Requirement R1 (Visualizer geometry & dimension expansion) and Requirement R2 (Queue button transparency & mobile responsive hide).

The suite operates independently of internal implementation quirks through:
1. Pure algorithmic oracles for metadata sorting, mood matching, editorial playlist ordering, and category derivation.
2. In-memory simulated player and DOM environments validating stage expansion, dock state persistence, and continuous audio playback.
3. Strict CSS AST variable remapping audits verifying that `--theme-*` semantic tokens are consumed without hardcoded background hex collisions.
4. Static structural and DOM contract assertions verifying AST element hierarchies, accessible labels, touch gesture thresholds, and navigation contracts.

---

## 2. 4-Tier Test Architecture Breakdown

| Tier | Category | Test Count | Description |
|---|---|:---:|---|
| **Tier 1** | Feature Coverage | 60 | 5 tests per feature area across all 12 acceptance criteria |
| **Tier 2** | Boundary & Corner Cases | 40 | 4 tests per area across 10 edge condition and robustness boundaries |
| **Tier 3** | Cross-Feature Combinations | 10 | Pairwise interactions between stage expansion, gestures, theme switching, and audio |
| **Tier 4** | Real-World User Scenarios | 5 | End-to-end user flows through first-time listening, gestures, and backgrounding |
| **Total** | **Full Suite** | **115** | **Comprehensive opaque-box verification** |

---

## 3. Coverage Matrix Across All 12 Acceptance Criteria

| # | Acceptance Criterion | Milestone | Tier 1 Tests | Tier 2 Boundaries | Combinatorial & E2E | Key Verifications |
|---|---|:---:|---|---|---|---|
| **1** | Newly Added Songs Count & Sort | M2 | T1.1.1 – T1.1.5 | T2.1.1 – T2.1.3 | T3.1, T4.1 | Exported `getNewlyAddedSongs`; capped at <=10; strictly descending order of catalog addition; immutability |
| **2** | 3-Tier Artwork Fallback Strategy | M2 | T1.2.1 – T1.2.5 | T2.2.1 – T2.2.4 | T3.9 | Tier 1: `track.artworkUrl` -> Tier 2: `album.coverUrl` -> Tier 3: SVG glyph fallback; zero broken `src` |
| **3** | Stage Expansion on Playback | M3 | T1.3.1 – T1.3.5 | T2.3.1 – T2.3.4 | T3.1, T3.3, T4.1, T4.2 | `isPlayerExpanded` state; defaults to `false`; song click in Sec A/D and playlist play in Sec B/C trigger `true` |
| **4** | Frequency Categories & Anti-Hallucination | M2 | T1.4.1 – T1.4.5 | T2.4.1 – T2.4.4 | T3.9, T4.4 | Exported `getFrequenciesCategories`; strictly existing moods/tags/artists; 0 hallucinated genres (Country, Metal rejected) |
| **5** | Listen To Recommendations | M2 | T1.5.1 – T1.5.5 | T2.1.4 | T4.4 | Exported `getListenToRecommendations`; mood overlap scoring; null track fallback; excludes current album |
| **6** | Featured Editorial Playlists | M2 | T1.6.1 – T1.6.5 | T2.5.1 – T2.5.4 | T4.1 | Exported `getFeaturedPlaylists`; exact order `['night-drive', 'soft-hours', 'japanese-indie', 'website-wala-playlist']`; skips missing IDs |
| **7** | Desktop Transport Minimize Button | M1 | T1.7.1 – T1.7.5 | T2.6.1 – T2.6.4 | T3.2 | Downward button `▼` immediately to the left of Shuffle; accessible `aria-label="Minimize player"`; triggers `onMinimize` |
| **8** | MinimizedPlayerIsland DOM Architecture | M3 | T1.8.1 – T1.8.5 | T2.7.1 – T2.7.4 | T3.2, T3.3, T3.4, T4.2 | Docked at `bottom: 0`; upper mirrors `queue-sheet__min-upper` (80x80 compact visualizer); lower mirrors `queue-sheet__min-lower` |
| **9** | Touch Gestures & Edge-Swipe Mechanics | M1/M3 | T1.9.1 – T1.9.5 | T2.8.1 – T2.8.4 | T3.5, T3.6, T4.3 | Artwork drag `translateX(min(48, deltaX * 0.25))`; release > 45px / velocity > 0.3 opens drawer; left-edge swipe <= 40px; swipe-down minimize |
| **10**| Navigation Overhaul & Discover Default | M2 | T1.10.1 – T1.10.5 | T2.9.1 – T2.9.4 | T3.6, T3.7, T4.1, T4.3 | `ViewName` includes `'discover'`; default view is `'discover'`; `NAV_LINKS` has `01 DISCOVER`; TopBar logo navigates to discover |
| **11**| Continuous Audio Engine Continuity | M3 | T1.11.1 – T1.11.5 | T2.10.1 – T2.10.4 | T3.1, T3.7, T3.8, T4.2, T4.5 | Root `PlayerProvider` boundary; dual `HTMLAudioElement`s with `fadeTokens`; 0 orphan audio instances; continuous through view & dock shifts |
| **12**| Theme Tokens & Layout Integration | M3 | T1.12.1 – T1.12.3 | — | T3.8 | Semantic CSS variables in `DiscoverView.css` and `MinimizedPlayerIsland.css`; zero clashing background hexes across all 6 themes |
| **R1**| Visualizer Dimension & Geometry Clamping | M1 | T1.12.4 | — | — | Canvas `calc(100% + 380px)` max 1400px; geometry clamped to `maxSafeRadius`; `ctx['setLineDash']` preserved |
| **R2**| Queue Button Styling & Mobile Visibility | M1 | T1.12.5 | — | T3.10 | Transparent `.transport__queue-button` without borders/shadows; hidden on `@media (max-width: 768px)` (`display: none !important;`) |

---

## 4. Milestone Verification Mapping

The suite organizes tests by milestone for progressive test-driven execution:

- **Milestone 1: UI, Gestures & Visualizer (`--milestone 1`)**:
  - Transport minimize button `▼` left of Shuffle (T1.7.1–T1.7.5, T2.6.1–T2.6.3)
  - Touch gestures in PlayerHome & AppShell (T1.9.1–T1.9.4, T2.8.1–T2.8.4, T3.5, T3.6)
  - Visualizer dimension expansion & clamped geometry (T1.12.4)
  - Transport queue button transparency & mobile hide (T1.12.5, T3.10)

- **Milestone 2: Discover Service & Navigation (`--milestone 2`)**:
  - Pure metadata functions in `src/services/discoverService.ts` (T1.1.1–T1.1.5, T1.4.1–T1.4.3, T1.5.1–T1.5.4, T1.6.1–T1.6.4, T2.1.1–T2.1.4, T2.4.1–T2.4.3, T2.5.1–T2.5.4)
  - 3-tier artwork fallback logic (T1.2.1–T1.2.5, T2.2.1–T2.2.4)
  - DiscoverView UI with Sections A, B, C, D (T1.4.4–T1.4.5, T1.5.5, T1.6.5, T2.4.4, T3.9)
  - Navigation overhaul & default view `'discover'` (T1.10.1–T1.10.5, T2.9.1–T2.9.4, T3.7)

- **Milestone 3: Minimized Island & Player Stage (`--milestone 3`)**:
  - Full player stage expansion & `isPlayerExpanded` state (T1.3.1–T1.3.5, T2.3.1–T2.3.4, T2.6.4)
  - `MinimizedPlayerIsland` DOM structure and mirroring (T1.8.1–T1.8.5, T1.9.5, T2.7.1–T2.7.4)
  - Continuous audio engine lifecycle & isolation (T1.11.1–T1.11.5, T2.10.1–T2.10.4)
  - Theme token integration across Discover & Minimized Island (T1.12.1–T1.12.3)

- **Milestone 4: Full System E2E & Scenarios (`--milestone 4`)**:
  - Cross-feature pairwise combinations (T3.1–T3.9)
  - Real-world end-user scenarios (T4.1–T4.5)

---

## 5. Verification Commands

To run the verification suite:

```bash
# 1. Full 4-tier acceptance suite (TDD failing phase until implemented, passes 115/115 when complete)
node scripts/verify-discover.mjs

# 2. Progressive milestone evaluation (marks pending for unimplemented milestones)
node scripts/verify-discover.mjs --progressive

# 3. Individual Milestone evaluation
node scripts/verify-discover.mjs --milestone 1
node scripts/verify-discover.mjs --milestone 2
node scripts/verify-discover.mjs --milestone 3
node scripts/verify-discover.mjs --milestone 4

# 4. Individual Tier evaluation
node scripts/verify-discover.mjs --tier 1
node scripts/verify-discover.mjs --tier 2
node scripts/verify-discover.mjs --tier 3
node scripts/verify-discover.mjs --tier 4

# 5. JSON schema report for automated CI/orchestrator consumption
node scripts/verify-discover.mjs --json

# 6. Companion project test suites
node scripts/verify-all.mjs          # 52 core checks (Must pass 52/52)
node scripts/verify-themes-e2e.mjs   # 78 theme engine checks (Must pass 78/78)
node scripts/verify-visualizer.mjs   # 115 audio visualizer checks (Must pass 115/115)
npm run build                       # TypeScript build check (tsc --noEmit && vite build)
```

---

## 6. Hand-Off Instructions for Implementing Worker

1. The test runner is strictly opaque-box. You do NOT need to write facade code to satisfy the tests; implementing the specifications directly in the assigned files will turn all tests green naturally.
2. In `Transport.tsx`, place the minimize button `▼` immediately before `<button className="transport__control-button" ... onClick={toggleShuffle}>`.
3. In `PlayerHome.tsx`, make sure the central artwork container binds `onTouchStart`, `onTouchMove`, `onTouchEnd` with horizontal spring translation `translateX(Math.min(48, deltaX * 0.25) + 'px')` and triggers `onOpenDrawer()` when released with `deltaX > 45` or velocity > 0.3.
4. In `src/services/discoverService.ts`, export the 4 pure functions matching the signatures in `PROJECT.md`.
5. Run `node scripts/verify-discover.mjs --progressive` after completing each milestone to track incremental completion.
