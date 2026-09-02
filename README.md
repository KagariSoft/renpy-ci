# RenPy CI 🚀

A fast, complete, and customizable **GitHub Action** to lint, compile, build, and publish **Ren'Py** visual novels and games — featuring native **Steam SDK** support, **GitHub Releases**, and **itch.io (Butler)** integration.

Designed for visual novel developers, studios, and CI/CD pipelines targeting the GitHub Actions Marketplace.

---

## ✨ Features

- 🎮 **Any Ren'Py Version**: Specify any supported Ren'Py SDK version (e.g. `8.5.2`, `8.3.4`, `7.5.x`).
- ♨️ **Steam SDK Support**: Automatically downloads and installs the official Ren'Py Steamworks libraries on-demand (`install-steam: true`).
- 👾 **itch.io Integration (Butler)**: Automatically installs Butler CLI and uploads your distribution packages to itch.io channels with smart suffix mapping (`publish-itch: true`).
- 🔍 **Automated Linting & Compilation**: Catch syntax errors, missing assets, and compilation issues before pushing to production.
- 📦 **Multi-Platform Distribution**: Builds your game using Ren'Py's headless distribute system.
- 🚀 **GitHub Releases Integration**: Automatically creates a GitHub Release and attaches all generated distribution packages (`.zip`, `.tar.bz2`, `.exe`, `.dmg`, etc.).
- 📁 **Workflow Artifacts**: Automatically uploads distributions to GitHub Actions artifact storage.
- 🧩 **Zero Extra Configuration**: Runs headless with dummy video and audio drivers (`SDL_VIDEODRIVER=dummy`).

---

## 🚀 Quick Start

### 1. Basic Lint & Build on Every Push

```yaml
name: Game CI

on:
  push:
    branches: [ main, dev ]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build Ren'Py Game
        uses: UnSetSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
```

---

### 2. Build with Steam Support

If your game integrates achievements, Steam Workshop, or the Steamworks overlay, enable Steam support to ensure proper compilation and packaging:

```yaml
name: Build with Steam

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build Game with Steam Support
        uses: UnSetSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'
```

---

### 3. Deploy to itch.io (via Butler)

Automatically deploy packages to your itch.io game page. It will automatically detect your project from `define build.itch_project = "user/game"` in your Ren'Py scripts or from the `itch-target` input:

```yaml
name: Deploy to Itch.io

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-itch:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build & Publish to itch.io
        uses: UnSetSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'
          publish-itch: 'true'
          itch-target: 'kagarisoft/rol'    # Or auto-detected from build.itch_project
          butler-key: ${{ secrets.BUTLER_API_KEY }}
```

> **Smart Channel Mapping**: If `itch-channel` is omitted, `renpy-ci` automatically maps packages by file suffix (e.g. `roses-of-love-1.3.7-pc.zip` -> `pc`, `roses-of-love-1.3.7-mac.zip` -> `mac`, `roses-of-love-1.3.7-market.zip` -> `market`).

---

### 4. Full Release: GitHub Releases + itch.io

Publish to both GitHub Releases and itch.io with a single workflow on version tags:

```yaml
name: Full Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build, Release, and Deploy to itch.io
        uses: UnSetSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'
          create-release: 'true'
          release-tag: ${{ github.ref_name }}
          release-name: 'Release ${{ github.ref_name }}'
          github-token: ${{ secrets.GITHUB_TOKEN }}
          publish-itch: 'true'
          itch-target: 'kagarisoft/rol'
          butler-key: ${{ secrets.BUTLER_API_KEY }}
```

---

## ⚙️ Inputs Reference

### General & Ren'Py Engine

| Input | Description | Required | Default |
|---|---|---|---|
| `renpy-version` | Ren'Py SDK version to download and use. | No | `8.5.2` |
| `game-dir` | Path to the Ren'Py game project directory. | No | `.` |
| `install-steam` | Download and install Steam support library into the SDK. | No | `false` |
| `lint` | Run `renpy lint` before building. | No | `true` |
| `compile` | Run `renpy compile` before building. | No | `true` |
| `build` | Run `renpy distribute` to build packages. | No | `true` |
| `package` | Specific distribution package(s) to build (e.g. `market`, `pc`, `mac`). | No | `""` (all) |
| `destination` | Custom destination directory for distributions. | No | `""` (auto) |
| `upload-artifact` | Upload built packages as workflow artifact. | No | `true` |
| `artifact-name` | Name of the uploaded artifact. | No | `renpy-build` |

### GitHub Releases

| Input | Description | Required | Default |
|---|---|---|---|
| `create-release` | Publish distribution packages to GitHub Release. | No | `false` |
| `release-tag` | Tag name for the release. | No | Current git tag/branch |
| `release-name` | Display title for the release. | No | Same as `release-tag` |
| `release-body` | Custom release notes (markdown). | No | Auto-generated |
| `release-draft` | Create release as a draft. | No | `false` |
| `release-prerelease` | Mark release as a prerelease. | No | `false` |
| `github-token` | GitHub token for creating releases. | No | `${{ github.token }}` |

### itch.io (Butler)

| Input | Description | Required | Default |
|---|---|---|---|
| `publish-itch` | Publish built distributions to itch.io via Butler CLI. | No | `false` |
| `itch-target` | Target game in `user/game` format (e.g. `kagarisoft/rol`). | No | Auto from `build.itch_project` |
| `itch-channel` | Specific channel name (e.g. `pc`, `win-64`, `market`). | No | Auto-detected from package suffix |
| `itch-userversion` | Version string to tag on itch.io. | No | `release-tag` / `GITHUB_REF_NAME` |
| `butler-key` | Butler API key / secret for authentication. | No | `${{ env.BUTLER_API_KEY }}` |

---

## 📤 Outputs

| Output | Description |
|---|---|
| `sdk-path` | Absolute path where the Ren'Py SDK is installed. |
| `dist-path` | Path to the directory where distributions were generated. |
| `release-url` | URL of the published GitHub Release (if `create-release: true`). |

---

## 🗺️ Roadmap & Upcoming Features

- [x] **itch.io Butler Integration**: Direct deploy to itch.io channels with smart package detection.
- [ ] **SteamPipe / steamcmd Upload**: Direct upload to Steam depots for automated staging & production releases.
- [ ] **Android Build Support**: Automated APK / AAB bundling with RAPT.
- [ ] **Web / WASM Build**: Direct export to HTML5/Web playable bundles.

---

## 📄 License

This project is licensed under the **UnSetSoft Public License (UPL) 1.0**. See the [LICENSE](LICENSE) file for details.
