# webOS Homebrew Channel

Use this app with [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel) on a rooted LG TV.

## Why “Add repository” fails

The official catalogue is `https://repo.webosbrew.org/api/apps.json`: JSON with **`paging`** and **`packages`**.

Homebrew Channel **does not** accept:

- **`https://github.com/…/moonfin-tv`** — that page is **HTML**, not the catalogue JSON.
- **`…/org.moonfinplus.webos.manifest.json` alone** — that file is a **single-app manifest**, not the **repository index** (there is no top-level **`packages`** array), so parsing fails.

You must add the **raw URL of the catalogue file** below.

## Custom repository URL (copy this)

After this file is on the **`main`** branch of **WJStephenson/moonfin-tv**, use:

```text
https://raw.githubusercontent.com/WJStephenson/moonfin-tv/main/packages/build-webos/homebrew-repo.json
```

In Homebrew Channel: **Settings → Add repository** → paste that URL exactly (HTTPS, ends with **`homebrew-repo.json`**).

## Release IPK on GitHub

Install needs a **public HTTPS** link to the `.ipk`. The manifests expect:

- **Tag:** `v2.3.0` (must match the version in the manifest files).
- **Asset name:** `org.moonfinplus.webos_2.3.0_all.ipk`
- Build: from the repo root run `npm install` and `npm run build:webos`, then upload the generated IPK from the repo root.

If you change version, run `npm run build:webos` again (updates the SHA256), then update **`homebrew-repo.json`**, **`org.moonfinplus.webos.manifest.json`**, and the release tag/asset names to match.

## One-off install without a custom repo

You can install from a **single manifest** using the Homebrew **install** flow that accepts a manifest URL, if your build offers it — but the **“Add repository”** field specifically needs **`homebrew-repo.json`**, not the manifest alone.

## IDs

- Application ID: `org.moonfinplus.webos`
- Display name: **moonfin+**
