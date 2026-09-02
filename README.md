# RenPy CI 🚀

A fast, complete, and customizable **GitHub Action** to lint, compile, build, and publish **Ren'Py** visual novels and games — featuring native **Steam SDK** support and **GitHub Releases** integration.

Designed for visual novel developers, studios, and CI/CD pipelines targeting the GitHub Actions Marketplace.

---

## ✨ Features

- 🎮 **Any Ren'Py Version**: Specify any supported Ren'Py SDK version (e.g. `8.5.2`, `8.3.4`, `7.5.x`).
- ♨️ **Steam SDK Support**: Automatically downloads and installs the official Ren'Py Steamworks libraries on-demand (`install-steam: true`).
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

### 3. Automatically Create GitHub Releases on Tag

When you push a version tag (e.g. `v1.0.0`), build the game and automatically upload all distribution packages to a GitHub Release:

```yaml
name: Release Game

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

      - name: Build & Publish Release
        uses: UnSetSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'
          create-release: 'true'
          release-tag: ${{ github.ref_name }}
          release-name: 'Release ${{ github.ref_name }}'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## ⚙️ Inputs

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
| `create-release` | Publish distribution packages to GitHub Release. | No | `false` |
| `release-tag` | Tag name for the release. | No | Current git tag/branch |
| `release-name` | Display title for the release. | No | Same as `release-tag` |
| `release-body` | Custom release notes (markdown). | No | Auto-generated |
| `release-draft` | Create release as a draft. | No | `false` |
| `release-prerelease` | Mark release as a prerelease. | No | `false` |
| `github-token` | GitHub token for creating releases. | No | `${{ github.token }}` |

---

## 📤 Outputs

| Output | Description |
|---|---|
| `sdk-path` | Absolute path where the Ren'Py SDK is installed. |
| `dist-path` | Path to the directory where distributions were generated. |
| `release-url` | URL of the published GitHub Release (if `create-release: true`). |

---

## 🗺️ Roadmap & Upcoming Features

- [ ] **Itch.io Butler Integration**: Direct deploy to itch.io channels using Butler CLI.
- [ ] **SteamPipe / steamcmd Upload**: Direct upload to Steam depots for automated staging & production releases.
- [ ] **Android Build Support**: Automated APK / AAB bundling with RAPT.
- [ ] **Web / WASM Build**: Direct export to HTML5/Web playable bundles.

---

## 📄 License

This project is licensed under the **UnSetSoft Public License (UPL) 1.0**. See the [LICENSE](LICENSE) file for details.
