# Publishing guide

This project ships as **one npm package** and is mirrored on **GitHub**. Everything you need to release v1.1.0 is here.

## Prerequisites

- Node.js ≥ 22.19 (tested on v24), pnpm or npm available.
- `npm` account with a login token (`npm login` once).
- GitHub account (`yuioi666`).

## 1. Pre-flight checks (local)

```bash
cd dsh-plugin-model-capability
git status                # working tree clean
npm run build             # rebuilds lib/client.js + lib/index.js
npm pack --dry-run        # list the exact tarball contents:
                          #  lib/client.js, lib/index.js, cordis.patch.yml,
                          #  img/*.png, README.md, docs/README-zh.md, LICENSE, package.json
```

Expected pack output: 15 files, ~780 kB tarball (includes `img/`). If something
is missing, fix the `files` array in `package.json` first.

## 2. Publish to npm

```bash
cd dsh-plugin-model-capability
npm login                    # one-time; writes your token to ~/.npmrc
npm publish                  # the prepublishOnly hook runs `npm run build` for you
npm view dsh-plugin-model-capability version   # confirm the new version resolves
```

Notes:

- The package is `dsh-plugin-model-capability@1.1.0` (see `package.json`).
- The tarball **includes `img/`** so the README screenshots render on the npm page.
- If the version was already published (accident), bump `version` and publish a
  patch; **never overwrite a published version** — the registry refuses it (E409)
  and re-publishing over a bad build is impossible. Fixes always ship as a new
  version number.
- OTP: if your account uses two-factor auth, `npm publish` asks for a one-time
  password from your authenticator app — you must run it in your own terminal.

## 3. Update GitHub

```bash
cd dsh-plugin-model-capability
git add -A
git commit -m "v1.1.0"
git push origin main
git tag v1.1.0
git push origin v1.1.0            # tag matches package.json version
```

Then open the repo → Releases → create a release from tag `v1.1.0`, paste the
feature summary from `git log --oneline`.

> Push credentials come from your machine's Git Credential Manager (the npm token
> used by automation has no repo scope). If a push asks for a browser login,
> complete it once — it is stored and reused.

## 4. Install into a real DSH profile (always pin the version!)

```bash
dsh plugin --profile web remove dsh-plugin-model-capability     # remove any old copy first
dsh plugin --profile web add dsh-plugin-model-capability@1.1.0  # pin the exact version
```

Then **restart `dsh --profile web`** — the running Web UI is not hot-reloaded on
plugin install. The **Model Capability** entry appears under Settings.

**Why pin the version** — three caches (registry CDN packument metadata, the
local pnpm store, the profile lockfile) can each serve stale data, so a bare
`dsh plugin add dsh-plugin-model-capability` may keep installing an older build.
Pinning `@1.1.0` bypasses metadata resolution. Full troubleshooting (including
`pnpm store prune` and how to verify the installed version) is in the README:
[Getting the latest version](./README.md#getting-the-latest-version-cache--publish-delay-caveats)
/ [拿到最新版](./docs/README-zh.md#拿到最新版缓存--发布时间差限制).

## 5. Post-release checklist

- [ ] `npm view dsh-plugin-model-capability` shows version `1.1.0` and the README with screenshots
- [ ] GitHub repo is public, `main` pushed, tag `v1.1.0` + release notes created
- [ ] Old plugin copy removed: no `dsh-plugin-model-capability` reference in the profile's `package.json` / `pnpm-lock.yaml`, `node_modules` directory gone
- [ ] `dsh plugin --profile web add dsh-plugin-model-capability@1.1.0` succeeds
- [ ] After restarting dsh web, Settings → Model Capability loads without console errors
- [ ] One write (e.g. change a model's thinking level) persists to `settings.yaml`