#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execSync } from 'child_process';

// Mask sensitive arguments when logging
function maskArgs(args, sensitiveValues) {
  return args.map(arg => {
    for (const secret of sensitiveValues) {
      if (secret && arg === secret) {
        return '******';
      }
    }
    return arg;
  });
}

// Download and setup SteamCMD
async function setupSteamCMD(tempDir) {
  const existing = getExistingSteamCMD();
  if (existing) {
    console.log(`Using existing SteamCMD at: ${existing}`);
    return existing;
  }

  const steamcmdDir = path.join(tempDir, 'steamcmd');
  fs.mkdirSync(steamcmdDir, { recursive: true });
  const steamcmdExe = path.join(steamcmdDir, process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh');

  if (fs.existsSync(steamcmdExe)) {
    return steamcmdExe;
  }

  console.log('Downloading SteamCMD...');
  const archiveUrl = process.platform === 'win32'
    ? 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
    : 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';

  const archivePath = path.join(steamcmdDir, process.platform === 'win32' ? 'steamcmd.zip' : 'steamcmd.tar.gz');

  const res = await fetch(archiveUrl);
  if (!res.ok) {
    throw new Error(`Failed to download SteamCMD: ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(archivePath, Buffer.from(arrayBuffer));

  if (process.platform === 'win32') {
    execSync(`tar -xf "${archivePath}" -C "${steamcmdDir}"`);
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${steamcmdDir}"`);
    fs.chmodSync(steamcmdExe, 0o755);
  }

  fs.unlinkSync(archivePath);
  console.log('SteamCMD installed successfully.');
  return steamcmdExe;
}

function getExistingSteamCMD() {
  try {
    const cmd = process.platform === 'win32' ? 'where steamcmd' : 'which steamcmd || which steamcmd.sh';
    const result = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
    if (result) return result.split(/\r?\n/)[0];
  } catch {
    // not in PATH
  }
  return null;
}

// Execute SteamCMD with args
function runSteamCMD(steamcmdPath, args, secrets) {
  return new Promise((resolve, reject) => {
    const displayArgs = maskArgs(args, secrets);
    console.log(`Executing: ${steamcmdPath} ${displayArgs.join(' ')}`);

    const child = spawn(steamcmdPath, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        SDL_VIDEODRIVER: 'dummy',
        SDL_AUDIODRIVER: 'dummy',
      }
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`SteamCMD exited with code: ${code}`));
      }
    });

    child.on('error', err => {
      reject(err);
    });
  });
}

// Locate or unpack content root
function resolveContentRoot(customRoot, distPath, tempDir) {
  if (customRoot && fs.existsSync(customRoot)) {
    return path.resolve(customRoot);
  }

  if (!distPath || !fs.existsSync(distPath)) {
    throw new Error(`Distribution directory not found: ${distPath}`);
  }

  // 1. Look for uncompressed directory inside distPath (e.g. *-market or folder with game files)
  const entries = fs.readdirSync(distPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullDir = path.join(distPath, entry.name);
      // Check if it has game directory or executable
      if (fs.existsSync(path.join(fullDir, 'game')) || fs.existsSync(path.join(fullDir, 'lib'))) {
        console.log(`Detected uncompressed game directory: ${fullDir}`);
        return fullDir;
      }
    }
  }

  // 2. Look for archive (prefer market or pc archive) to extract
  const archives = entries
    .filter(e => e.isFile() && (e.name.endsWith('.zip') || e.name.endsWith('.tar.bz2') || e.name.endsWith('.tar.gz')))
    .map(e => e.name);

  if (archives.length > 0) {
    const marketArchive = archives.find(a => a.includes('market')) || archives.find(a => a.includes('pc')) || archives[0];
    const archiveFullPath = path.join(distPath, marketArchive);
    const extractDir = path.join(tempDir, 'steam-content-extracted');
    fs.mkdirSync(extractDir, { recursive: true });

    console.log(`Extracting archive '${marketArchive}' for SteamPipe content root...`);
    if (marketArchive.endsWith('.zip')) {
      execSync(`unzip -q -o "${archiveFullPath}" -d "${extractDir}"`);
    } else {
      execSync(`tar -xf "${archiveFullPath}" -C "${extractDir}"`);
    }

    // Check if extracted into a subfolder
    const subEntries = fs.readdirSync(extractDir, { withFileTypes: true });
    const subDirs = subEntries.filter(s => s.isDirectory());
    if (subDirs.length === 1 && !fs.existsSync(path.join(extractDir, 'game'))) {
      const nested = path.join(extractDir, subDirs[0].name);
      console.log(`Using nested extracted folder: ${nested}`);
      return nested;
    }

    return extractDir;
  }

  throw new Error(`Could not find valid game content or archives in: ${distPath}`);
}

// Find main Windows executable for DRM wrapping
function findWindowsExecutable(contentRoot) {
  const entries = fs.readdirSync(contentRoot);
  const exes = entries.filter(f => f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('unitycrashhandler'));
  if (exes.length > 0) {
    return path.join(contentRoot, exes[0]);
  }
  return null;
}

async function main() {
  console.log('::group::Preparing Steam Deployment');

  const appId = process.env.STEAM_APP_ID;
  const depotId = process.env.STEAM_DEPOT_ID;
  const username = process.env.STEAM_USERNAME;
  const password = process.env.STEAM_PASSWORD;
  const guardCode = process.env.STEAM_GUARD_CODE || '';
  const branch = process.env.STEAM_BRANCH || '';
  const desc = process.env.STEAM_DESC || `Build ${process.env.GITHUB_REF_NAME || 'CI'}`;
  const wrapDrm = process.env.STEAM_WRAP_DRM === 'true';
  const drmFlags = process.env.STEAM_DRM_FLAGS || '6'; // Default: Compatibility Mode 6
  const customRoot = process.env.STEAM_CONTENT_ROOT || '';
  const distPath = process.env.RENPY_DIST_PATH || '';

  if (!appId) throw new Error('Missing STEAM_APP_ID');
  if (!depotId) throw new Error('Missing STEAM_DEPOT_ID');
  if (!username) throw new Error('Missing STEAM_USERNAME');
  if (!password) throw new Error('Missing STEAM_PASSWORD');

  const tempDir = process.env.RUNNER_TEMP || os.tmpdir();
  const steamWorkDir = path.join(tempDir, 'steam-build-vdfs');
  const buildOutputDir = path.join(steamWorkDir, 'output');
  fs.mkdirSync(steamWorkDir, { recursive: true });
  fs.mkdirSync(buildOutputDir, { recursive: true });

  const contentRoot = resolveContentRoot(customRoot, distPath, tempDir);
  console.log(`Content Root resolved to: ${contentRoot}`);

  const steamcmdPath = await setupSteamCMD(tempDir);
  const secrets = [password, guardCode].filter(Boolean);

  // 1. DRM Wrapping (if requested)
  if (wrapDrm) {
    console.log('Applying Steam DRM Wrap...');
    const exePath = findWindowsExecutable(contentRoot);
    if (!exePath) {
      console.warn('⚠️ Warning: No .exe found in ContentRoot to apply DRM wrap. Skipping DRM wrap.');
    } else {
      console.log(`Found executable to wrap: ${exePath}`);
      const wrappedExePath = `${exePath}.wrapped`;

      const drmArgs = [
        '+login', username, password
      ];
      if (guardCode) drmArgs.push(guardCode);
      drmArgs.push(
        '+drm_wrap', String(appId), exePath, wrappedExePath, 'drmtoolp', String(drmFlags),
        '+quit'
      );

      await runSteamCMD(steamcmdPath, drmArgs, secrets);

      if (fs.existsSync(wrappedExePath)) {
        fs.unlinkSync(exePath);
        fs.renameSync(wrappedExePath, exePath);
        console.log('✅ Executable successfully protected with Steam DRM!');
      } else {
        throw new Error('Steam DRM tool did not generate the protected output executable.');
      }
    }
  }

  // 2. Generate VDFs (reusing steamcli structure)
  console.log('Generating SteamPipe VDF scripts...');
  const appBuildVdfPath = path.join(steamWorkDir, `app_build_${appId}.vdf`);
  const depotBuildVdfPath = path.join(steamWorkDir, `depot_build_${depotId}.vdf`);

  const depotBuildVdf = `"DepotBuild"
{
	"DepotID" "${depotId}"
	"ContentRoot" "${contentRoot}"
	"FileMapping"
	{
		"LocalPath" "*"
		"DepotPath" "."
		"Recursive" "1"
	}
	"FileExclusion" "*.pdb"
}
`;

  const appBuildVdf = `"AppBuild"
{
	"AppID" "${appId}"
	"Desc" "${desc}"
	"ContentRoot" "${contentRoot}"
	"BuildOutput" "${buildOutputDir}"
	"setlive" "${branch}"
	"Depots"
	{
		"${depotId}" "${depotBuildVdfPath}"
	}
}
`;

  fs.writeFileSync(depotBuildVdfPath, depotBuildVdf, 'utf-8');
  fs.writeFileSync(appBuildVdfPath, appBuildVdf, 'utf-8');
  console.log(`Created: ${appBuildVdfPath}`);
  console.log(`Created: ${depotBuildVdfPath}`);

  // 3. Run SteamPipe Build & Upload
  console.log('Running SteamPipe upload via SteamCMD...');
  const buildArgs = [
    '+login', username, password
  ];
  if (guardCode) buildArgs.push(guardCode);
  buildArgs.push(
    '+run_app_build', appBuildVdfPath,
    '+quit'
  );

  await runSteamCMD(steamcmdPath, buildArgs, secrets);
  console.log('::endgroup::');
  console.log('✅ SteamPipe build and upload completed successfully!');
}

main().catch(err => {
  console.error('::endgroup::');
  console.error(`❌ Steam deployment failed: ${err.message}`);
  process.exit(1);
});
