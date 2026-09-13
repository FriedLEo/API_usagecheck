# Changelog

All notable changes to DeepSeek Usage Tracker are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning policy

Changes accumulate under **Unreleased** and the version is bumped only once
enough of them have built up to justify a release. Do not bump the version for
individual changes.

To cut a release:

1. Move the Unreleased entries into a new `## [x.y.z] - YYYY-MM-DD` section.
2. Update `version` in `package.json`. It is the single source of truth — the
   installer artifact name is derived from it by `electron-builder.yml`.
3. Rebuild with `npm run dist:win` and record the installer's SHA-256 in the
   release notes (the beta is unsigned, so the checksum is the integrity check).

Bump rules: **patch** for fixes only, **minor** for new user-visible features,
**major** once the app leaves beta.

Current version: `0.1.0` (beta, unreleased).

## [Unreleased]

### Added

- Home overview with one clickable card per provider, and a detail page per
  provider opened from its card. The app now opens on the overview instead of a
  single stacked dashboard, so extra providers no longer crowd one screen.
- Each overview card headlines one figure: pay-as-you-go providers show today's
  spend with today's tokens beneath it, and quota providers show a progress bar
  for their 5-hour window with its reset countdown.
- OpenCode Zen "Go" subscription quota monitoring: an optional third credential
  adds a provider page showing the 5-hour / weekly / monthly usage windows with a
  percentage (up to two decimals), a bar, and a reset countdown that reports days
  for long windows (for example `29d 9h`). Window names follow the Zen console.
  Uses the undocumented `opencode.ai/zen/go/v1/usage` endpoint, which is isolated
  behind its own client and treated as experimental. No balance figure is
  available from that API, so the panel reports quota only.
- Startup failures now show an error dialog and terminate the process instead of
  leaving a background process running with no window or tray icon.
- `src/renderer/src/format.ts` centralises currency and token formatting, and
  guards against non-ISO currency codes — `Intl.NumberFormat` throws a
  `RangeError` on those, which previously would have broken the dashboard.

### Changed

- The interface is now a bright theme: a soft tinted canvas under white cards with
  an azure accent. Roughly 87 hardcoded colours were replaced by design tokens in
  `:root`, which also gives the motion system shared curves and durations. Every
  text and graphic pairing was contrast-checked numerically (>= 4.5:1 for text,
  >= 3:1 for graphics); the chart series and their legend swatches moved to deeper
  hues that clear 3:1 on white, where the old ones sat at 1.5–2.5:1.
- Added a small motion system: views cross-fade and slide in the direction of
  travel, overview cards stagger in, cards give press feedback, and the quota bar
  animates its fill. Reduced motion keeps the fades and drops the movement.
- `color-scheme: light` is set, so an OS in dark mode no longer renders inputs and
  scrollbars dark inside the light panel.
- The OpenCode Zen quota panel moved off the main dashboard onto its own
  provider page, reachable from the overview card.
- Freshness alerts are scoped per view: the overview surfaces every problem,
  while a provider page shows only the sources it owns.
- The dashboard KPI cards and the daily activity chart now share a single
  formatting path, so their output can no longer drift apart.
- Quota windows are delivered through the dashboard snapshot's existing
  `quotaWindows` field, so they refresh with every existing refresh path (button,
  interval, tray, and resume) rather than needing a second scheduler.
- The reset countdown is now a shared, testable helper instead of a local
  function inside the pricing banner.

### Fixed

- **The chart ignored `prefers-reduced-motion`.** Recharts animates with its own
  `requestAnimationFrame` loop rather than CSS, so no media query could stop it;
  the chart is now told explicitly, and reverts to a static render.
- **The current day could be missing from the dashboard.** Daily buckets are
  keyed by local calendar date, but the range was bounded using UTC dates, so for
  every timezone ahead of UTC the local date ran ahead of the bound and today's
  bucket was filtered out — up to 8 hours a day in UTC+8, where today's bar and
  today's spend would read as empty. Timezones behind UTC instead lost the oldest
  day of the window. The same mismatch also shifted the coverage range shown
  above the chart and the "Tracked since …" label by a day. Date keys now come
  from one shared local-offset helper.
- **The app appeared not to launch.** `electron-store` v11 is ESM-only while the
  main process is bundled as CommonJS, so `require('electron-store')` returned
  the module namespace rather than the class, and `new Store(...)` threw
  `TypeError: Store is not a constructor` inside `app.whenReady()`. The
  rejection was unhandled, so startup never reached the window or tray, and the
  still-running process held the single-instance lock — making every later
  double-click a silent no-op.
- **The tray icon was invisible.** Electron's `nativeImage` cannot decode SVG, so
  the SVG data URL produced an empty image. Replaced with an embedded PNG, which
  matters because the app is tray-first (`skipTaskbar` is on with auto-hide).
- **Daily activity spend showed a bare, unrounded number.** The chart tooltip
  rendered the raw value (e.g. `spend : 4.8042952`) with no unit; it now renders
  as currency, e.g. `Spend : CN¥4.80`.
- **A credential with no vault entry rendered as "connected".** The check was
  `state !== 'NOT_CONFIGURED'`, which is `true` when the row is absent, so a
  credential that had never been saved displayed a "✓ Connected" badge.
