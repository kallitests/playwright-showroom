#!/usr/bin/env node
// =============================================================================
// scripts/local-saucedemo/serve.mjs — Serve a local build of SauceDemo
// =============================================================================
// Why this exists
//   www.saucedemo.com is the reference target. When it is unreachable (corporate
//   proxy, offline demo, sandboxed CI runner), the suite can run against a local
//   build of the OFFICIAL SauceDemo source code (github.com/saucelabs/sample-app-web).
//
// Fidelity
//   The live site is hosted on GitHub Pages with the "spa-github-pages" trick:
//   any deep link (e.g. /inventory.html) is answered with HTTP 404 + 404.html,
//   which rewrites the URL and boots the single-page app. This server reproduces
//   exactly that behaviour so that HTTP-level tests behave like production.
//
// Usage
//   node scripts/local-saucedemo/serve.mjs [buildDir] [port]
//   defaults: buildDir=.local-saucedemo/sample-app-web/build  port=4173
// No dependency: Node.js standard library only.
// =============================================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.resolve(process.argv[2] ?? '.local-saucedemo/sample-app-web/build');
const port = Number(process.argv[3] ?? process.env.LOCAL_SAUCEDEMO_PORT ?? 4173);

if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.error(`[local-saucedemo] No build found in ${buildDir}. Run: npm run saucedemo:setup`);
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/vnd.microsoft.icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

function send(res, status, file) {
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(status, { 'content-type': type, 'access-control-allow-origin': '*' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(buildDir, path.normalize(rel));

  // Path traversal guard
  if (!file.startsWith(buildDir)) {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    send(res, 200, file);
    return;
  }
  // GitHub Pages behaviour: unknown path => 404 status + 404.html (SPA bootstrap)
  send(res, 404, path.join(buildDir, '404.html'));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[local-saucedemo] Serving ${buildDir} on http://127.0.0.1:${port}`);
});
