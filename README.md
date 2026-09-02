# RenPy CI

Continuous integration and automated distribution pipeline for Ren'Py visual novels and games. Provides headless SDK installation, static analysis, multi-platform packaging, GitHub Releases integration, itch.io deployment via Butler, and SteamPipe staging with optional Steam DRM wrapping.

---

## Overview

RenPy CI is designed for game developers and studios targeting automated build, validation, and multi-channel publishing workflows on GitHub Actions. It abstracts runner environment configuration, graphics driver emulation, and distribution packaging into a modular composite action.

### Capabilities

- **SDK Version Management**: Resolves and installs any official Ren'Py SDK release (7.x and 8.x series).
- **Steamworks SDK Integration**: Automatically installs the official Steamworks support library directly into the engine runtime.
- **Headless Execution**: Configured with virtual framebuffers and dummy audio/video drivers (`SDL_VIDEODRIVER=dummy`, `SDL_AUDIODRIVER=dummy`) for non-interactive runner environments.
- **Static Analysis and Compilation**: Enforces code quality checks via `renpy lint` and bytecode generation via `renpy compile`.
- **Distribution Packaging**: Invokes Ren'Py distribution tools headlessly to produce platform packages (PC, Windows, Linux, macOS, Market, Android).
- **GitHub Releases**: Automatically extracts generated release archives and attaches them to GitHub Releases.
- **itch.io Butler Integration**: Directly publishes packages to target channels using itch.io Butler CLI with automated channel resolution based on package suffix.
- **SteamPipe and Steam DRM Deployment**: Builds SteamPipe VDF definitions, invokes SteamCMD headlessly, and optionally wraps Windows binaries with Valve DRM before depot staging.

---

## Workflows

### 1. Basic CI: Lint and Distribution Build

Runs syntax validation, bytecode compilation, and packages the game into build artifacts on pushes to branches.

```yaml
name: Continuous Integration

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

      - name: Run RenPy CI
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          lint: 'true'
          compile: 'true'
          build: 'true'
```

---

### 2. Building with Steamworks Support

Enables Steam integration libraries in the build runner. Required if game scripts reference `achievement.steam` or Steam API modules during startup:

```yaml
name: Build with Steamworks

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run RenPy CI
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'
          build: 'true'
```

---

### 3. Automated Deployment to itch.io (Butler)

Builds distribution packages and deploys them to itch.io channels using Butler CLI. Target can be specified via input or resolved automatically from `build.itch_project` in game scripts:

```yaml
name: Deploy to itch.io

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

      - name: Build and Publish to itch.io
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'
          publish-itch: 'true'
          itch-target: 'kagarisoft/rol'
          butler-key: ${{ secrets.BUTLER_API_KEY }}
```

When `itch-channel` is omitted, packages are mapped to channels based on their file suffix (for example, `game-1.0-pc.zip` maps to channel `pc`, and `game-1.0-market.zip` maps to channel `market`).

---

### 4. Automated Deployment to Steam (SteamPipe and DRM Wrapping)

Uploads depot builds to Steamworks via SteamCMD. Optionally wraps the Windows executable with Steam DRM prior to depot generation:

```yaml
name: Deploy to Steam

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-steam:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build and Deploy to Steam
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          package: 'market'
          install-steam: 'true'
          publish-steam: 'true'
          steam-appid: '1299800'
          steam-depot-id: '1299801'
          steam-username: ${{ secrets.STEAM_USERNAME }}
          steam-password: ${{ secrets.STEAM_PASSWORD }}
          steam-branch: 'beta'
          steam-wrap-drm: 'true'
          steam-drm-flags: '6'
```

---

### 5. Multi-Channel Release Pipeline

Unified release workflow that builds distributions, publishes them to GitHub Releases, stages builds to itch.io, and deploys depots to Steam upon pushing version tags:

```yaml
name: Production Release

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
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build and Distribute Everywhere
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.2'
          game-dir: '.'
          install-steam: 'true'

          # GitHub Releases
          create-release: 'true'
          release-tag: ${{ github.ref_name }}
          github-token: ${{ secrets.GITHUB_TOKEN }}

          # itch.io
          publish-itch: 'true'
          itch-target: 'kagarisoft/rol'
          butler-key: ${{ secrets.BUTLER_API_KEY }}

          # Steam
          publish-steam: 'true'
          steam-appid: '1299800'
          steam-depot-id: '1299801'
          steam-username: ${{ secrets.STEAM_USERNAME }}
          steam-password: ${{ secrets.STEAM_PASSWORD }}
          steam-wrap-drm: 'true'
          steam-drm-flags: '6'
```

---

## Configuration Reference

### Engine and Build Options

| Input | Type | Default | Description |
|---|---|---|---|
| `renpy-version` | string | `8.5.2` | Ren'Py SDK version to download and execute. |
| `game-dir` | string | `.` | Path to game project directory or repository root containing the `game/` folder. |
| `install-steam` | boolean | `false` | Download and install Steam support libraries into the SDK runtime. |
| `lint` | boolean | `true` | Execute static linting (`renpy.sh <game-dir> lint`). |
| `compile` | boolean | `true` | Force script bytecode compilation (`renpy.sh <game-dir> compile`). |
| `build` | boolean | `true` | Generate distribution packages (`distribute`). |
| `package` | string | `""` | Specific package identifier to build (e.g. `market`, `pc`). If empty, builds all packages defined in `build.package`. |
| `destination` | string | `""` | Custom output directory for distributions. If empty, uses `build.destination`. |
| `upload-artifact` | boolean | `true` | Upload built packages to GitHub Actions workflow artifacts. |
| `artifact-name` | string | `renpy-build` | Name identifier for the uploaded workflow artifact. |

### GitHub Releases Options

| Input | Type | Default | Description |
|---|---|---|---|
| `create-release` | boolean | `false` | Publish distribution packages to a GitHub Release. |
| `release-tag` | string | Current git ref | Tag identifier for the target release. |
| `release-name` | string | Tag identifier | Title for the GitHub Release. |
| `release-body` | string | `""` | Release notes in markdown. When omitted, automatically generated from commits. |
| `release-draft` | boolean | `false` | Publish the release as an unpublished draft. |
| `release-prerelease` | boolean | `false` | Mark the release as a pre-release. |
| `github-token` | string | `${{ github.token }}` | GitHub token with write permissions for repository releases. |

### itch.io (Butler) Options

| Input | Type | Default | Description |
|---|---|---|---|
| `publish-itch` | boolean | `false` | Enable automated upload to itch.io using Butler CLI. |
| `itch-target` | string | `""` | Target project formatted as `user/game`. Resolves from `build.itch_project` in game scripts if omitted. |
| `itch-channel` | string | `""` | Destination channel name (e.g. `pc`, `win-64`, `market`). Auto-detected from package suffix if omitted. |
| `itch-userversion` | string | Release tag | Version string registered in itch.io build metadata. |
| `butler-key` | string | `${{ env.BUTLER_API_KEY }}` | API secret key generated from itch.io account settings. |

### Steam (SteamPipe & DRM) Options

| Input | Type | Default | Description |
|---|---|---|---|
| `publish-steam` | boolean | `false` | Enable automated staging and upload to Steam via SteamPipe. |
| `steam-appid` | string | `""` | Steam Application ID (required when `publish-steam: true`). |
| `steam-depot-id` | string | `""` | Target Steam Depot ID (required when `publish-steam: true`). |
| `steam-username` | string | `""` | Steamworks account username with build upload privileges. |
| `steam-password` | string | `""` | Steamworks account password. |
| `steam-guard-code` | string | `""` | Optional Steam Guard 2FA authentication code. |
| `steam-branch` | string | `""` | Target beta branch to activate upon build completion (`setlive`). |
| `steam-desc` | string | Auto-generated | Descriptive build comment recorded in Steamworks build history. |
| `steam-wrap-drm` | boolean | `false` | Apply Valve Steam DRM wrapper to the Windows executable before building depots. |
| `steam-drm-flags` | string | `6` | DRM flags: `0` (default), `6` (compatibility mode, recommended for Ren'Py), `32` (quiet mode), `38` (compatibility and quiet). |
| `steam-content-root` | string | `""` | Explicit path to directory of uncompressed files for SteamPipe. Automatically resolved from build output if omitted. |

---

## Outputs

| Output | Description |
|---|---|
| `sdk-path` | Absolute filesystem path where the Ren'Py SDK was installed. |
| `dist-path` | Path to the directory containing generated distribution files. |
| `release-url` | URL pointing to the published GitHub Release (when `create-release: true`). |

---

## Technical Notes

1. **Audio and Graphics Drivers**: The action automatically configures dummy audio and video drivers to allow execution on headless Ubuntu virtual machines without requiring an active X server or audio device.
2. **Library Compatibility**: System dependency installation handles both `libasound2` (Ubuntu 22.04 and earlier) and `libasound2t64` (Ubuntu 24.04 and later) packages dynamically.
3. **Secret Masking**: All sensitive credentials passed for SteamCMD and Butler are masked in CI execution logs.

---

## License

This project is licensed under the **UnSetSoft Public License (UPL) 1.0**. See the [LICENSE](LICENSE) file for terms and conditions.
