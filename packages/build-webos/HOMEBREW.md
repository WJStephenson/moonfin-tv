# webOS Homebrew Channel

Use this app with [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel) on a rooted LG TV.

## One-off install (manifest URL)

1. Build the IPK: from the repo root run `npm install` then `npm run build:webos`.
2. Publish the IPK (for example attach `org.moonfinplus.webos_*_all.ipk` from the repo root to a GitHub Release).
3. Edit `packages/build-webos/org.moonfinplus.webos.manifest.json`:
   - Replace `REPLACE_USER` and `REPLACE_REPO` in `iconUri` and `sourceUrl` with your GitHub user and repository name.
   - Set `ipkUrl` to the **direct HTTPS URL** of the IPK (for example a GitHub Release asset URL).
4. Commit and push. The build step `update-manifest.js` fills in `ipkHash.sha256` when you run `npm run build:webos`.
5. On the TV, open Homebrew Channel → add a repository whose URL is the **raw** manifest, for example:
   - `https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/packages/build-webos/org.moonfinplus.webos.manifest.json`

Some Homebrew builds expect a **repository index** instead of a single manifest. If your client asks for a repo JSON, use `homebrew-repo.json` in this folder: replace the placeholder GitHub URLs, set the nested `manifest.ipkUrl` to your published IPK URL, then add the raw URL of `homebrew-repo.json` as the custom repository.

## IDs

- Application ID: `org.moonfinplus.webos`
- Display name: **moonfin+**
