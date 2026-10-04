# Dashboard Polish — Apple-inspired UI

UI/UX only. No backend changes. Everything dispatches existing controls, events and instances.

| Feature | Files | Shortcut |
|---|---|---|
| Command palette | `js/command-palette.js` | `Cmd/Ctrl+K` |
| Theme switcher | `js/theme-switcher.js`, `css/polish.css` | `Alt+T` (cycle) |
| Glass morphism | `css/polish.css` (`.glass` + tokens) | — |
| Shortcuts reference | `js/shortcuts-reference.js` | `Cmd/Ctrl+?` |
| Notification center | `js/notification-center.js` | `Alt+N` |

Shared pieces: `js/ui-utils.js` (escape, safe storage, clipboard, focus trap) and
`js/shortcuts.js` (single registry feeding the key handler, palette hints and reference modal).

## Command palette
Searches goals (recent, captured from the terminal input), workflows, profiles, memory items
(org + verified for the active profile), commands and settings. Fuzzy matching favors prefixes
and consecutive characters; subtitles match literally. Empty query shows Recent + Suggested.
Keys: `↑/↓` move (wraps), `Enter` run, `Esc` close. Memory items copy their value; goals fill
the input (they never auto-run). Recents: `kudbee:palette:recent`, goals: `kudbee:recentGoals`.

## Theme
Preference `light | dark | system` in `kudbee:theme`. The resolved theme is `<html data-theme>`;
an inline script in `index.html` sets it before first paint. `system` tracks
`prefers-color-scheme` live. Changing theme adds `html.theme-transition` for 0.35s so colors
cross-fade over 0.3s. Components must use CSS tokens (`--bg-*`, `--text-*`, `--glass-*`,
`--hover-bg`, `--shadow-*`), never hard-coded colors.

## Glass
`.glass` (and header, workflow modal, profile dropdown, actions menu, sharing panel):
`backdrop-filter: blur(20px)`, translucent `--glass-bg`, gradient overlay and inset highlight.
Falls back to solid surfaces without `backdrop-filter` support or with
`prefers-reduced-transparency`. Menus that open from inside the blurred header use the more
opaque `--glass-bg-menu` because nested backdrop blur cannot reach the page.

## Shortcuts
Register in `js/shortcuts.js`: `{ id, keys: 'mod+k', category, description, action }`.
`mod` = Cmd or Ctrl. Shortcuts without `mod`/`alt` never fire while typing. Open modals block
non-`allowInModal` shortcuts. An action returning `false` leaves the key's default behavior.
The reference modal supports filtering, per-row copy and a print layout (`Print` button).

## Notifications
Categories: `system`, `approvals`, `runs`, `errors`. Stored in `kudbee:notifications` with a
24h TTL (pruned on load, every minute and on open). First run seeds **mock** data
(`kudbee:notifications:seeded`; clearing all does not re-seed). Also reacts to the existing
`workflow-saved`, `profile:switched`, `run-started` and `run-completed` events.
API: `NotificationCenterInstance.add({ category, title, body })`.

## Tests
Open `/test-polish.html` (94 cases). Covers fuzzy matching, palette UI/keyboard, shortcut
registry, reference modal, theme persistence/system tracking/glass tokens, and notification
lifecycle (TTL, caps, escaping, aria state).
