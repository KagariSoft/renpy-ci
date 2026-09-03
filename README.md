# RenPy CI

Continuous integration, automated building, and multi-channel distribution pipeline for Ren'Py visual novels and games on GitHub Actions.

Features headless SDK installation, bytecode compilation, static linting, multi-platform distribution packaging, GitHub Releases, automated itch.io deployments via Butler, and SteamPipe uploads with Valve Steam DRM wrapping.

---

## Features

- **Automated SDK Setup**: Downloads and configures any official Ren'Py SDK (7.x and 8.x series).
- **Steamworks SDK Integration**: Automatically downloads and installs Steam support libraries into the Ren'Py SDK runtime (`install-steam: true`).
- **Headless Virtual Displays**: Built-in dummy audio and video drivers (`SDL_VIDEODRIVER=dummy`, `SDL_AUDIODRIVER=dummy`) for reliable execution in non-interactive runner environments.
- **Code Quality & Bytecode**: Static analysis via `renpy lint` and compilation via `renpy compile`.
- **Packaging Engine**: Builds platform distributions headlessly (`market`, `pc`, `win`, `mac`, `linux`, `all`).
- **Multi-Channel Publishing**:
  - **GitHub Releases**: Automatic creation of releases with attached game archives and generated changelogs.
  - **itch.io (Butler)**: Direct pushes to target itch.io channels with automatic channel resolution.
  - **Steam (SteamPipe & DRM)**: Automatic generation of `app_build` and `depot_build` VDFs, in-place Steam DRM wrapping, and depot upload in a single atomic SteamCMD session.
- **Self-Hosted Runner Support**:
  - Automatic 32-bit multiarch runtime library setup (`lib32gcc-s1`, `libc6:i386`, `lib32stdc++6`) for SteamCMD.
  - Node.js runtime fallback ensuring execution on minimal hosts.
  - Automated post-job workspace and temporary build cleanup (`use-self-hosted: true`) to protect VPS disk space.
  - Persistent host session preservation to eliminate repeated Steam Guard 2FA challenges.

---

## Quick Start Workflows

### 1. Basic CI: Lint & Distribution Build

Performs static analysis, compiles script bytecode, and generates distribution packages saved as workflow artifacts:

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
        uses: actions/checkout@v7
        with:
          clean: true

      - name: Run RenPy CI
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.3'
          game-dir: '.'
          lint: 'true'
          compile: 'true'
          build: 'true'
          upload-artifact: 'true'
          artifact-name: 'my-game-build'
```

---

### 2. Deploy to Steam (SteamPipe + Steam DRM Wrap)

Compiles the game, sanitizes the Windows executable PE header, applies the official Valve Steam DRM wrapper, and stages the depot to the target branch in SteamPipe:

```yaml
name: Deploy to Steam

on:
  push:
    branches: [ main ]

jobs:
  steam:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v7
        with:
          clean: true

      - name: Build & Deploy to Steam
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.3'
          game-dir: '.'
          package: 'market'
          install-steam: 'true'
          publish-steam: 'true'
          steam-appid: ${{ secrets.STEAM_APPID }}
          steam-depot-id: ${{ secrets.STEAM_DEPOT_ID }}
          steam-username: ${{ secrets.STEAM_USERNAME }}
          steam-password: ${{ secrets.STEAM_PASSWORD }}
          steam-config-vdf: ${{ secrets.STEAM_CONFIG_VDF }}
          steam-branch: 'next'
          steam-wrap-drm: 'true'
          steam-drm-flags: '6'
```

---

### 3. Deploy to itch.io (Butler)

Builds distribution packages and deploys them to target itch.io channels using Butler CLI:

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
        uses: actions/checkout@v7
        with:
          clean: true

      - name: Publish to itch.io
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.3'
          game-dir: '.'
          publish-itch: 'true'
          itch-target: 'my-studio/my-game'
          butler-key: ${{ secrets.BUTLER_API_KEY }}
```

---

### 4. Self-Hosted Runner Deploy (VPS / Dedicated Server)

Recommended configuration when hosting your own GitHub Actions Runner on a Linux VPS or dedicated server:

```yaml
name: Self-Hosted Production Deploy

on:
  push:
    branches: [ main ]
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: self-hosted
    steps:
      - name: Checkout repository
        uses: actions/checkout@v7
        with:
          clean: true

      - name: Build & Publish Game
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.3'
          game-dir: 'game'
          use-self-hosted: 'true'
          install-steam: 'true'
          build: 'true'

          # Steam Deployment
          publish-steam: 'true'
          steam-appid: ${{ secrets.STEAM_APPID }}
          steam-depot-id: ${{ secrets.STEAM_DEPOT_ID }}
          steam-username: ${{ secrets.STEAM_USERNAME }}
          steam-password: ${{ secrets.STEAM_PASSWORD }}
          steam-branch: 'next'
          steam-wrap-drm: 'true'
          steam-drm-flags: '6'
```

---

### 5. Multi-Channel Release Pipeline (Complete)

Unified release pipeline that builds distributions, publishes them to GitHub Releases, stages builds to itch.io, and deploys depots to Steam upon pushing version tags:

```yaml
name: Full Multi-Channel Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: self-hosted
    steps:
      - name: Checkout repository
        uses: actions/checkout@v7
        with:
          clean: true

      - name: Build and Distribute Everywhere
        uses: KagariSoft/renpy-ci@v1
        with:
          renpy-version: '8.5.3'
          game-dir: '.'
          use-self-hosted: 'true'
          install-steam: 'true'
          build: 'true'

          # GitHub Releases
          create-release: 'true'
          release-tag: ${{ github.ref_name }}
          github-token: ${{ secrets.GITHUB_TOKEN }}

          # itch.io
          publish-itch: 'true'
          itch-target: 'my-studio/my-game'
          butler-key: ${{ secrets.BUTLER_API_KEY }}

          # Steam
          publish-steam: 'true'
          steam-appid: ${{ secrets.STEAM_APPID }}
          steam-depot-id: ${{ secrets.STEAM_DEPOT_ID }}
          steam-username: ${{ secrets.STEAM_USERNAME }}
          steam-password: ${{ secrets.STEAM_PASSWORD }}
          steam-branch: 'default'
          steam-wrap-drm: 'true'
          steam-drm-flags: '6'
```

---

## Steam Guard and Unattended Authentication

When uploading builds to Steam in automated CI/CD pipelines, Steam Guard 2FA can be handled in any of the following modes:

### 1. Self-Hosted Runner Persistent Session (Recommended for Studios)

Self-hosted runners (such as a Linux VPS or dedicated server) are the optimal solution for publishing visual novels and games to Steam without repeatedly encountering Steam Guard MFA challenges. 

Unlike ephemeral cloud runners with fluctuating IPs, a self-hosted runner possesses a **static, permanent IP address**. Once you perform a one-time authorization, Valve permanently registers the runner machine.

#### Step 1: Install SteamCMD Globally on the Runner Host

Log in to your runner machine via SSH and install the official SteamCMD package:

```bash
# Ubuntu / Debian
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y steamcmd
```

*(SteamCMD will be installed globally to `/usr/games/steamcmd`, which `renpy-ci` automatically discovers).*

#### Step 2: Perform a One-Time Manual Login

Run SteamCMD directly from your server terminal to register the machine sentry with Valve:

```bash
# Note: Use single quotes ('...') around your password so bash doesn't interpret special characters like '!'
steamcmd +login <your_steam_username> '<your_steam_password>' +quit
```

*Or launch SteamCMD in interactive mode:*

```text
$ steamcmd
Steam> login <your_steam_username>
Password: <enter_password>
```

When prompted:
```text
This account is protected by a Steam Guard mobile authenticator.
Please confirm the login in the Steam Mobile app on your phone.
```
Open the Steam Mobile app on your device and tap **Confirm / Approve**. Once SteamCMD prints `Waiting for user info... OK`, type `quit` to exit.

#### Step 3: Fully Automated Deployments Going Forward

Valve writes the authorized hardware sentry certificates and session ticket to `~/.steam/steam/config/config.vdf`.

- **`renpy-ci` automatically detects the existing host credentials** and omits the password parameter on all subsequent workflow runs (`steamcmd +login <username>`).
- SteamCMD connects instantly using the cached session ticket (`Logging in using cached credentials... OK`).
- **Result**: Future CI/CD pipelines wrap DRM, stage depots, and publish updates **100% unattended with zero phone prompts**.

### 2. Ephemeral Cloud Runners via `steam-config-vdf`

On ephemeral cloud runners (such as GitHub-hosted `ubuntu-latest`), runners start with clean disks on new IPs. You can export an authorized SteamCMD session:

1. Log in to SteamCMD on a local workstation:
   ```bash
   steamcmd +login <username> <password> +quit
   ```
2. Encode the generated `config.vdf` file to Base64:
   - **Linux / macOS**:
     ```bash
     base64 -w 0 <path-to-steamcmd>/config/config.vdf
     ```
   - **Windows (PowerShell)**:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("<path-to-steamcmd>/config/config.vdf")) | Set-Clipboard
     ```
3. Store the string in a repository secret named `STEAM_CONFIG_VDF`.
4. Supply `steam-config-vdf: ${{ secrets.STEAM_CONFIG_VDF }}` in your workflow.

### 3. Time-Based One-Time Password (TOTP)

If your automated account has access to the shared secret (e.g. via `andriivitiv/steam-totp`):

```yaml
      - name: Generate TOTP
        id: steam_totp
        uses: andriivitiv/steam-totp@v1
        with:
          shared_secret: ${{ secrets.STEAM_SHARED_SECRET }}

      - name: Deploy to Steam
        uses: KagariSoft/renpy-ci@v1
        with:
          publish-steam: 'true'
          steam-username: ${{ secrets.STEAM_USERNAME }}
          steam-password: ${{ secrets.STEAM_PASSWORD }}
          steam-totp: ${{ steps.steam_totp.outputs.code }}
```

### 4. Interactive Steam Mobile App Confirmation

If no cached session or TOTP code is present, SteamCMD will pause execution and dispatch a push approval request to your Steam Mobile application. Approving the request allows SteamCMD to proceed.

---

## Configuration Reference

### Engine and Build Options

| Input | Type | Default | Description |
|---|---|---|---|
| `renpy-version` | string | `8.5.3` | Ren'Py SDK version to download and execute. |
| `game-dir` | string | `.` | Path to game project directory containing the `game/` folder. |
| `install-steam` | boolean | `false` | Download and install official Steamworks libraries into the Ren'Py SDK. |
| `lint` | boolean | `true` | Execute static analysis (`renpy.sh <game-dir> lint`). |
| `compile` | boolean | `true` | Force script bytecode compilation (`renpy.sh <game-dir> compile`). |
| `build` | boolean | `true` | Generate distribution packages (`distribute`). |
| `package` | string | `""` | Specific package identifier to build (e.g. `market`, `pc`). If empty, builds all packages defined in `build.package`. |
| `destination` | string | `""` | Custom output directory for distributions. If empty, uses `build.destination`. |
| `upload-artifact` | boolean | `true` | Upload built packages to GitHub Actions workflow artifacts. |
| `artifact-name` | string | `renpy-build` | Name identifier for the uploaded workflow artifact. |
| `use-self-hosted` | boolean | `false` | Enable Node.js environment bootstrap, multiarch 32-bit libraries, and automatic workspace cleanup for self-hosted runners. |

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
| `steam-config-vdf` | string | `""` | Base64-encoded content of Steam `config.vdf` to reuse an authorized session. |
| `steam-totp` | string | `""` | Time-based One-Time Password (TOTP) code for automated 2FA login. |
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

1. **PE Header Sanitization for Steam DRM**: MinGW-compiled 64-bit Windows executables built by Ren'Py often contain PE Data Directory 5 (Base Relocations) pointing to an unmapped RVA (`0x1F000`), which causes Valve's DRM wrapper tool to fail with `Invalid data directory 5 VA range: Not a valid PE code module` (EResult 8). RenPy CI inspects and sanitizes the PE header in-place before wrapping, ensuring 100% reliable DRM application.
2. **Atomic SteamCMD Session**: DRM wrapping and SteamPipe depot uploading are chained in a single unified SteamCMD command (`+login ... +drm_wrap ... +run_app_build ... +quit`). This ensures that an authenticated session is established once, preventing invalidation or disappearing push notifications in the Steam Mobile app.
3. **Headless Audio and Graphics**: Automatically configures dummy audio and video drivers to allow execution on headless Linux runners without requiring an active X server, pulse audio daemon, or display.
4. **Secret Masking**: All sensitive credentials passed for SteamCMD and Butler are securely masked in CI execution logs.

---

## License

This project is licensed under the **UnSetSoft Public License (UPL) 1.0**. See the [LICENSE](LICENSE) file for terms and conditions.
