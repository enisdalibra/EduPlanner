# EduPlanner Design System

This document is the authoritative design guide for the current EduPlanner
application. EduPlanner uses React and TypeScript; it is not a collection of
standalone HTML pages.

The original Vanilla JavaScript and CDN-based prototype has been preserved only
as historical context in
[docs/archive/legacy-design-prototype.md](docs/archive/legacy-design-prototype.md).
Do not copy implementation patterns from that archive into production code.

## Current implementation

| Concern | Current source of truth |
| --- | --- |
| Application framework | React 19 and TypeScript |
| Build and development | Vite 6 |
| Styling | Tailwind CSS 4 through `@tailwindcss/vite` |
| Design tokens and shared CSS | `src/index.css` |
| UI primitives | `src/components/ui/` |
| Routes and lazy loading | `src/App.tsx` |
| Page layout and navigation | `src/components/layout/` |
| Theme behavior | `src/hooks/useTheme.tsx` |
| Icons | `src/components/ui/icon.tsx` and the generated local font subset |
| User-facing language | `src/hooks/dict.ts` through `useTranslation()` |

New pages must be `.tsx` components integrated into the current layout and route
tree. Do not add:

- standalone feature HTML files;
- inline Tailwind Play CDN configuration;
- remote Google Fonts;
- per-page stylesheets that duplicate shared tokens;
- inline event handlers such as `onclick`; or
- direct `localStorage` theme manipulation.

## Application structure

The preferred implementation path is:

```text
route-level feature view
        |
        +--> shared layout and UI primitives
        |
        +--> feature hook
                |
                +--> feature API or service
                        |
                        +--> Dexie / IndexedDB
```

Views should coordinate display and user interaction. Put reusable stateful
behavior in hooks and mutations in feature APIs or services. Multi-table and
destructive changes must use transactions.

Register route-level features lazily in `src/App.tsx`. Full-screen experiences,
such as presentations and quizzes, may live outside the standard `AppLayout`
only when the route intentionally replaces normal navigation.

## Tokens and themes

Use the semantic tokens defined in `src/index.css` rather than introducing
near-duplicate colors. The core light-theme colors are:

| Token | Value | Purpose |
| --- | --- | --- |
| `primary` | `#6246ea` | Primary actions, links, focus, and active state |
| `danger` | `#e45858` | Destructive actions and errors |
| `success` | `#58e49e` | Confirmation and positive states |
| `secondary` | `#d1d1e9` | Subtle borders and secondary surfaces |
| `background` | `#fffffe` | Main light surface |
| `text` | `#2b2c34` | Main light-theme text |
| `warning` | `#f59e0b` | Warnings and caution states |

Dark mode is controlled through `ThemeProvider` and `useTheme()`. The supported
values are `light`, `dark`, and `system`, persisted under `ais-theme`. Components
must provide explicit dark-theme pairs where a semantic token is insufficient.

Do not read or write the obsolete prototype key `darkMode`.

## Typography and icons

Inter is bundled locally through `@fontsource/inter`. Do not add a remote font
request.

Use existing typography utilities:

- `.page-title` for route headings;
- `.page-description` for route summaries;
- the typography already provided by shared dialogs, cards, labels, and inputs;
  and
- `font-mono` only for identifiers, filenames, keyboard input, or code-like
  values.

Use the shared `Icon` component. Material Symbols are collected at build time
and written to `src/assets/material-symbols-rounded-subset.woff2` by
`npm run icons:subset`. A new icon must be referenced through `<Icon name="…" />`
so the build can detect and include it.

## Shape and spacing

EduPlanner uses a soft, rounded visual hierarchy:

| Element | Preferred shape |
| --- | --- |
| Buttons, badges, and toggles | `rounded-full` |
| Primary cards and dialogs | `rounded-3xl` |
| Secondary panels and table shells | `rounded-2xl` |
| Inputs and selects | `rounded-xl` |
| Media and thumbnails | `rounded-lg` |

Prefer shared component variants over repeating long utility-class strings.
Use the page and panel classes already defined in `src/index.css` before adding
another abstraction.

## Layering

Use this z-index order:

| Layer | Token |
| --- | --- |
| Base content | `z-0` |
| Sticky table content | `z-10` |
| Sidebar | `z-30` |
| Header | `z-40` |
| Dropdown or popover | `z-50` |
| Dialog or modal | `z-[60]` |
| Toast | `z-[70]` |
| Tooltip | `z-[80]` |

Avoid arbitrary higher values. Fix the ownership or portal relationship when a
component appears below the wrong layer.

## Components

### Buttons

Use `src/components/ui/button.tsx`. Choose a semantic variant instead of
rebuilding button styles in a feature. Destructive actions require the
destructive variant and an explicit confirmation when data cannot be recovered.

Buttons must:

- have a clear text label or an accessible name;
- show a disabled/loading state during asynchronous writes;
- avoid duplicate submissions; and
- preserve visible keyboard focus.

### Forms and dialogs

Use the shared input, label, select, checkbox, and dialog primitives. Validation
messages must explain what the user can correct without printing sensitive
record contents.

Dialogs must provide:

- a descriptive title;
- keyboard focus management through the shared primitive;
- a clear cancel path;
- an explicit destructive-action label when applicable; and
- a scrollable content region when the viewport is constrained.

### Tables

Wrap data tables in a rounded, overflow-safe panel. Preserve readable headers,
keyboard access, and horizontal scrolling on narrow screens. Use virtualization
for large interactive collections when existing feature patterns support it.

### Empty, loading, and error states

Every data-dependent page must distinguish:

- loading;
- empty but valid;
- error; and
- populated states.

Do not render an empty list as if loading had silently failed. Error messages
must not include student names, note contents, backups, or other sensitive data.

### Toasts

Use the existing toast integration rather than creating feature-specific DOM
containers. Toasts should confirm the result or provide a next action; they
must not expose sensitive record content.

## Responsive behavior

The desktop layout uses the shared sidebar and header. Mobile behavior must
retain access to primary navigation and actions without depending on hover.

Test at minimum:

- a narrow mobile viewport;
- a tablet-width viewport;
- the standard desktop layout;
- browser zoom at 200%; and
- long Indonesian and English labels.

Avoid fixed widths that force important controls off-screen.

## Accessibility

All changes must maintain:

- semantic headings in logical order;
- labels for form controls;
- accessible names for icon-only buttons;
- visible keyboard focus;
- keyboard-operable menus and dialogs;
- sufficient color contrast;
- text or icons in addition to color for status;
- reduced-motion behavior where animation is nonessential; and
- meaningful loading and error announcements.

Use the shared primitives because they provide much of the required keyboard and
focus behavior. Verify the final feature rather than assuming the primitive
alone guarantees accessibility.

## Internationalization

Every user-facing string must have matching Indonesian and English entries in
`src/hooks/dict.ts` and must be accessed through `useTranslation()`.

Do not hardcode a user-facing string in a React view, including:

- buttons and labels;
- placeholder and empty-state text;
- dialogs and confirmations;
- toasts and errors;
- tooltips; and
- accessible names.

User-authored content is displayed as entered and is not translated.

## Privacy and content safety

Use synthetic data in tests, examples, and screenshots:

- `Siswa Contoh 01`;
- NIS `DEMO-0001`; and
- `Kelas Demo A`.

Never add real educational records, browser-profile screenshots, backups, or
partially anonymized production fixtures.

External Markdown images must continue to use the existing consent and HTTPS
controls. Do not add arbitrary HTML rendering or bypass content sanitization and
CSP protections.

For destructive restore or data-deletion experiences:

- show what will change without displaying unnecessary record contents;
- require explicit confirmation;
- preserve transactional behavior; and
- describe recovery limits accurately.

## Review checklist

Before completing a UI change, verify:

- [ ] The feature is a React/TypeScript component integrated with current routes.
- [ ] Existing tokens and shared components are reused.
- [ ] Light, dark, and system themes remain usable.
- [ ] Indonesian and English strings are both present.
- [ ] Loading, empty, error, and populated states are handled.
- [ ] Keyboard navigation and visible focus work.
- [ ] Mobile, desktop, and 200% zoom layouts remain usable.
- [ ] No sensitive or production-derived data is present.
- [ ] Offline behavior is preserved or the limitation is documented.
- [ ] Data mutations use the appropriate feature API/service and transaction.
