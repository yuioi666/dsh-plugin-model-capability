# Publishing guide

This project ships as **one npm package** and is mirrored on **GitHub**. Everything you need to release v0.1.0 is here.

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
                          #  img/*.png, README.md, README.zh.md, LICENSE, package.json
```

Expected pack output: 14 files, ~780 kB tarball. If something is missing, fix the
`files` array in `package.json` first.

## 2. Publish to npm

```bash
cd dsh-plugin-model-capability
npm login                    # one-time; writes your token to ~/.npmrc
npm publish                  # the prepublishOnly hook runs `npm run build` for you
npm view dsh-plugin-model-capability   # confirm it resolves + shows README
```

Notes:

- The package is `dsh-plugin-model-capability@0.1.0` (see `package.json`).
- The tarball **includes `img/`** so the README screenshots render on the npm page.
- If the version was already published (accident), bump `version` and publish a
  patch; never overwrite a published version.

## 3. Create the GitHub repository

The API token in this session has no `repo` scope, so creation was done manually:

1. Open https://github.com/new
2. Repository name: `dsh-plugin-model-capability`
3. Visibility: **Public** (this project is MIT-licensed)
4. Do **not** initialize with README/.gitignore/LICENSE (the repo already has them)
5. Create repository

Then push the existing history (2 commits on `main`):

```bash
cd dsh-plugin-model-capability
git remote add origin https://github.com/yuioi666/dsh-plugin-model-capability.git   # if not present
git push -u origin main
```

Optional after the first push:

```bash
git tag v0.1.0
git push origin v0.1.0          # tag matches package.json version
```

Then open the repo → Releases → create a release from tag `v0.1.0`, paste the
feature summary from `git log --oneline`.

## 4. Install into a real DSH profile

```bash
dsh plugin --profile web add dsh-plugin-model-capability
```

Then **restart `dsh --profile web`** — the running Web UI is not hot-reloaded on
plugin install. The **Model Capability** entry appears under Settings.

## 5. Post-release checklist

- [ ] `npm view dsh-plugin-model-capability` shows the README with screenshots
- [ ] GitHub repo is public, `main` pushed, tag `v0.1.0` + release notes created
- [ ] `dsh plugin --profile web add dsh-plugin-model-capability` succeeds
- [ ] After restarting dsh web, Settings → Model Capability loads without console errors
- [ ] One write (e.g. change a context window) persists to `settings.yaml`