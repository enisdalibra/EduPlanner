# Deployment and rollback

EduPlanner is a static, client-side PWA. Deploy only the generated `dist/`
directory over HTTPS. The browser origin owns the IndexedDB database, so changing
the scheme, host, port, or base path creates a different storage context from the
user's perspective.

The deployment boundary is:

```text
source repository
      |
      +--> clean production build
                |
                +--> dist/ static assets
                          |
                          +--> static host / GitHub Pages

user browser origin
      |
      +--> IndexedDB application database
      +--> localStorage preferences and optional mock backup
      +--> Cache Storage PWA assets
```

Only the `dist/` static assets cross the deployment boundary. IndexedDB,
`localStorage`, downloaded backups, imported workbooks, and user-created content
remain in the user's browser or filesystem. They are not read during build and
cannot be included in a deployment through the application architecture.

## Prerequisites

- Use Node.js `22.22.0` or newer, as required by `package.json`. CI reads its
  baseline version from `.nvmrc`. Install dependencies from the lockfile with
  `npm ci`.
- Select a static host that serves unknown files normally; application navigation
  uses hash routes and does not require an SPA rewrite rule.
- Enable HTTPS. Service workers are unavailable on ordinary insecure origins.
- Before moving an existing installation to another origin, export a JSON backup
  from the old origin and verify that it can be restored in a test browser profile.
- Build from a clean, reviewed checkout. Do not copy an existing working directory
  or browser profile into the deployment artifact.

## Release checks and local preview

Run the complete release gate from a clean checkout:

```bash
npm ci
npm run release:check
npm run preview
```

Open `http://127.0.0.1:4173` and verify:

1. Dashboard and at least one hash route load without console errors.
2. A sample record remains after reload.
3. Backup export and restore work in a disposable browser profile.
4. After one online load, an offline reload displays the application shell.
5. The browser reports an active service worker and no missing asset requests.

`verify` runs type-checking, coverage thresholds, the production build and its
bundle-budget and generated-PWA offline checks, release-artifact allowlist
validation, and the full dependency audit. `release:check` runs the tracked-file
`privacy:check` first, then the complete `verify` chain. Do not publish an
artifact produced by a failed gate.

The artifact uploaded to a host must be exactly the `dist/` directory produced
by that successful build. Do not deploy the repository root, `src/`, `docs/`,
tests, coverage output, local screenshots, or browser artifacts.

## Release identity

The release version has one source of truth in `package.json`; the root package
entry in `package-lock.json` must match it. Every production build embeds:

- the Semantic Versioning value from `package.json`;
- the full commit SHA of the checked-out source; and
- whether the worktree contained changes when the build started.

Users can see the version and shortened revision on the **About** page. The
generated `dist/release.json` contains the complete machine-readable identity
and is included in the offline application shell. The release-artifact gate
rejects a missing, malformed, or version-mismatched identity file.

A revision displayed with `-dirty` is useful for local testing but must not be
published. For a tagged release:

1. Start from a clean worktree and run `npm run release:check`.
2. Confirm that `package.json`, `package-lock.json`, and the changelog release
   heading contain the same version.
3. Confirm that `dist/release.json` has `"dirty": false` and records the commit
   intended for publication.
4. Commit the release state before creating the matching `v<version>` tag.
5. Create the GitHub Release from that exact tag and record the deployed commit
   and workflow run.

Do not move an existing release tag or reuse a version for different source.

## Static hosting base path

The default build targets the origin root (`/`). For a host mounted below a path,
set `DEPLOY_BASE_PATH` to a value that starts and ends with `/`:

```bash
DEPLOY_BASE_PATH=/eduplanner/ npm run build
```

PowerShell equivalent:

```powershell
$env:DEPLOY_BASE_PATH='/eduplanner/'
npm run build
Remove-Item Env:DEPLOY_BASE_PATH
```

Deploy the resulting `dist/` directory at exactly that path. A mismatched path
breaks JavaScript, CSS, manifest, and service-worker URLs. The build rejects base
paths containing traversal, query strings, fragments, or missing boundary slashes.

## Manual GitHub Pages deployment

The `Deploy GitHub Pages` workflow is intentionally manual:

1. In repository settings, select **GitHub Actions** as the Pages publishing source.
2. Add deployment protection rules to the `github-pages` environment as required.
3. Open **Actions → Deploy GitHub Pages → Run workflow**.
4. Leave `ref` empty to deploy the selected branch, or enter a reviewed tag/SHA.
5. Confirm that the build and deploy jobs pass, then follow the verification list
   below using the URL reported by the deploy job.

The workflow derives `/repository-name/` for project Pages and `/` for an
`owner.github.io` repository. It runs the same release gate before uploading
`dist/`; it never publishes source files or a locally generated artifact.
Every external action is pinned to a full commit SHA, with its release tag kept
as an inline comment for review. Dependabot checks those pins weekly; review the
upstream release and CI result before merging an update.

### GitHub Pages security limitation

GitHub Pages does not provide repository-controlled custom response headers.
Consequently, a Pages deployment receives the production CSP baseline from the
HTML `<meta>` element and the referrer policy, but it cannot enforce
`frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, or a
`Permissions-Policy` response header. Do not add `frame-ancestors` to the meta
policy: browsers ignore that directive outside an HTTP response header.

The production meta policy still restricts scripts, connections, forms, objects,
frames loaded by EduPlanner, workers, fonts, and images. Development-only
WebSocket origins are injected by Vite while serving locally and are absent from
the production build.

Use GitHub Pages for source review, demonstrations with synthetic data, and
installations where this residual hosting limitation is accepted. For a
deployment that must resist cross-origin framing and send the complete header
set below, select a static host or edge proxy that supports custom response
headers. Merely changing the workflow cannot add those headers to GitHub Pages.

For another static host, run a root or subpath build as described above and upload
the contents of `dist/` atomically. Keep the previous artifact available until
post-deployment verification completes.

Static hosting does not require an application server, database service,
authentication service, or environment secret. `DEPLOY_BASE_PATH` is a
build-time path setting, not a credential. Do not put API keys or private values
in Vite/client environment variables because compiled browser code is public.

## Database and backup compatibility

Application deployment and user-data migration are separate operations:

- publishing a release replaces static application assets;
- Dexie opens and migrates the database inside each user's browser on that
  origin;
- deployment does not upload, download, reset, or centrally migrate user data;
  and
- backup migration occurs only when a user explicitly selects a supported backup
  for restore.

Before releasing a database schema change:

1. Add a new forward-only Dexie version rather than editing an already released
   schema version.
2. Test upgrade from every supported deployed database version with synthetic
   data.
3. Test reload and offline startup after the migration.
4. Test current backup export and restore after migration.
5. Document whether backups remain readable by the new release.
6. Treat a rollback as unsafe until the older application has been tested against
   a database already opened by the newer release.

The generated PWA leaves a new service worker waiting until the user accepts the
in-app update notice. Deployment must not re-enable automatic activation or
inject a second registration script. Test both **Later** (the active session
continues unchanged) and **Update now** (the waiting worker activates and the
page reloads).

The backup format version and Dexie database version are different compatibility
controls. Increasing one does not automatically increase the other. Backups from
a newer unsupported format must remain rejected with an upgrade instruction.

## Hosting headers and cache policy

When the host supports response headers, configure at least:

```text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; form-action 'self'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Keep the CSP aligned with `index.html`. The HTTP header is authoritative and can
enforce `frame-ancestors`; the HTML policy remains a baseline for hosts without
custom header support. The policy in `index.html` is generated from
`scripts/content-security-policy.mjs`; update that source and these recommended
headers together.

Recommended caching:

| Path | Cache-Control |
| --- | --- |
| `/index.html`, `/sw.js`, `/manifest.webmanifest` | `no-cache` |
| `/assets/*` | `public, max-age=31536000, immutable` |

Do not cache the HTML shell or service-worker entry immutably. Hashed assets are
safe to retain because each content change produces a new URL.

## Post-deployment verification

1. Record the deployed commit SHA, workflow run, URL, and verification owner.
2. Load the site in a clean browser profile and confirm all expected hash routes.
3. Confirm the manifest and service worker use the intended base path and scope.
4. Reload once offline after the service worker reports activation.
5. Check browser console/network panels for CSP violations and 404 responses.
6. Import a small `.xlsx` roster and download its template to exercise lazy chunks.
7. Confirm existing users' local data remains visible on the unchanged origin.

## Rollback checklist

Rollback republishes application assets; it does not restore or change IndexedDB
records stored in users' browsers.

Use this decision guide:

| Situation | Rollback approach |
| --- | --- |
| Assets changed; database schema did not | Redeploy the last verified artifact and complete smoke tests. |
| New code added a backward-compatible schema version | Test the old artifact against an already upgraded disposable profile before rollback. |
| New code performed a transformation the old code cannot read | Do not roll back the frontend alone; prepare a compatible forward fix or an explicitly tested recovery plan. |
| Deployment moved to a different origin | Restore a user-selected JSON backup at the target origin; deployment cannot move browser data. |
| User records are incorrect | Application rollback is not data rollback; use the validated backup/recovery workflow. |

1. Stop further releases and record the incident symptoms and current deployment
   SHA.
2. Identify the last verified commit SHA and its release-check results.
3. Compare database schema versions. Do not roll back across an incompatible Dexie
   migration until the older code has been tested against the upgraded database.
4. Run **Deploy GitHub Pages** manually with the last verified SHA in `ref`, or
   atomically republish that host's retained artifact.
5. Verify the deployment URL, service-worker activation, hash routes, offline reload,
   CSP/network console, and a non-destructive read of existing data.
6. Ask affected users to close other tabs and reload once so the updated service
   worker can take control. Do not instruct users to clear site data unless a backup
   exists and data loss is explicitly accepted.
7. Record the rollback workflow run/artifact, validation evidence, and follow-up fix.

Keep the failed and restored deployment SHAs, build logs, compatibility decision,
and verification evidence in the release record. Never request a real user backup
or browser profile as rollback evidence.
