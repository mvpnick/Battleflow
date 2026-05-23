# Changelog

## Unreleased

### Fixed
- `DrawerPayload` union had a dead `'modifier'` kind with no rendering branch and no matching data type — removed
- Ternary used for side effects in `PhaseReferenceScreen` toggle handler — replaced with `if/else`
- `key={i}` on reminder rows in `UnitPhaseSection` — replaced with `key={r.text}`
- ESLint was linting `design-reference/**` (82 errors) — added to `globalIgnores`

### Changed
- `WeaponProfileRow`, `RuleItem`, `StratagemItem` — clickable `<div>` elements converted to `<button type="button">` for keyboard and screen-reader accessibility; button resets added to `globals.css`
- `DetailDrawer` — added `role="dialog"`, `aria-modal="true"`, `aria-label`, and Escape-to-close
- Fonts (Geist, JetBrains Mono, Instrument Serif) switched from Google CDN `@import` to `next/font/google` self-hosting — works offline at events
- `tokens.css` font stacks updated to use next/font CSS variables (`--font-geist`, `--font-mono`, `--font-display`)
- `app/layout.tsx` — added `Viewport` export (`width=device-width`, `initialScale=1`, `themeColor=#0a0b0e`)
- TopBar logo (`◬`) converted to `<Link href="/">` — provides back navigation from `/roster` to home
