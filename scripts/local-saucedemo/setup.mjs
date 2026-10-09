#!/usr/bin/env node
// =============================================================================
// scripts/local-saucedemo/setup.mjs — Build SauceDemo from its official sources
// =============================================================================
// Clones github.com/saucelabs/sample-app-web into .local-saucedemo/ and builds
// it, so the suite can run with LOCAL_SAUCEDEMO=1 when www.saucedemo.com is
// unreachable (corporate proxy, offline demo, sandboxed runner).
//
//   npm run saucedemo:setup            # clone (or pull) + install + build
//   SAUCEDEMO_REF=<sha|tag> npm run saucedemo:setup   # pin a revision
//
// Cross-platform (Windows / macOS / Linux). Requires git and Node.js >= 20.
// Upstream declares node >= 24.9 in "engines"; the build works on Node 20/22,
// so engine-strict is disabled for this install only.
// =============================================================================

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = 'https://github.com/saucelabs/sample-app-web.git';
const root = path.resolve('.local-saucedemo');
const appDir = path.join(root, 'sample-app-web');
const ref = process.env.SAUCEDEMO_REF;

const run = (cmd, cwd = process.cwd()) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, HUSKY: '0' } });
};

fs.mkdirSync(root, { recursive: true });

if (fs.existsSync(path.join(appDir, '.git'))) {
  run('git fetch --depth 1 origin ' + (ref ?? 'HEAD'), appDir);
  run('git checkout --force FETCH_HEAD', appDir);
} else {
  run(`git clone --depth 1 ${REPO} "${appDir}"`);
  if (ref) {
    run(`git fetch --depth 1 origin ${ref}`, appDir);
    run('git checkout --force FETCH_HEAD', appDir);
  }
}

run('npm ci --ignore-scripts --no-audit --no-fund --engine-strict=false', appDir);
run('npx vite build', appDir);

const sha = execSync('git rev-parse --short HEAD', { cwd: appDir }).toString().trim();
console.log(`\n[local-saucedemo] Built sample-app-web@${sha} -> ${path.join(appDir, 'build')}`);
console.log('[local-saucedemo] Run the suite with: npm run test:local');
