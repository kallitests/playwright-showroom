#!/usr/bin/env node
// =============================================================================
// scripts/notify/notify.mjs — Optional Slack / Teams alerting
// =============================================================================
// Reads metrics/summary.json (written by reporters/metrics-reporter.ts) and
// posts a short message to every channel that is configured:
//   SLACK_WEBHOOK_URL   Slack incoming webhook
//   TEAMS_WEBHOOK_URL   Microsoft Teams (Workflows "post to channel" webhook)
//   NOTIFY_ON           failure (default) | always
//   NOTIFY_DRY_RUN=1    print the payloads instead of sending them
// No variable set => nothing is sent and the script exits 0.
// Webhook URLs are secrets: provide them via CI secrets, never in the code.
// Email alerting is handled in the GitHub workflow (see .github/workflows).
// =============================================================================

import fs from 'node:fs';

const file = `${process.env.METRICS_DIR ?? 'metrics'}/summary.json`;
if (!fs.existsSync(file)) {
  console.log(`[notify] ${file} not found — nothing to send.`);
  process.exit(0);
}
const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const failed = s.status !== 'passed';
const mode = (process.env.NOTIFY_ON ?? 'failure').toLowerCase();
if (!failed && mode !== 'always') {
  console.log('[notify] run passed and NOTIFY_ON=failure — no alert.');
  process.exit(0);
}

const title = `${failed ? '❌' : '✅'} Playwright Showroom — ${s.status.toUpperCase()} (${s.passRate}% pass)`;
const lines = [
  `Target: ${s.baseURL}`,
  `Executed ${s.totals.executed} · failed ${s.totals.failed} · flaky ${s.totals.flaky} · known defects ${s.totals.knownDefects} · ${s.durationSec}s`,
  ...s.failedTests.slice(0, 5).map((t) => `• ${t}`),
  ...(s.failedTests.length > 5 ? [`… and ${s.failedTests.length - 5} more`] : []),
  ...(s.runUrl ? [`Run: ${s.runUrl}`] : []),
];
const text = [title, ...lines].join('\n');

const targets = [];
if (process.env.SLACK_WEBHOOK_URL) targets.push({ name: 'Slack', url: process.env.SLACK_WEBHOOK_URL, body: { text } });
if (process.env.TEAMS_WEBHOOK_URL) {
  targets.push({
    name: 'Teams',
    url: process.env.TEAMS_WEBHOOK_URL,
    body: {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              { type: 'TextBlock', text: title, weight: 'Bolder', wrap: true },
              ...lines.map((l) => ({ type: 'TextBlock', text: l, wrap: true, spacing: 'None' })),
            ],
          },
        },
      ],
    },
  });
}

if (!targets.length) {
  console.log('[notify] no channel configured (SLACK_WEBHOOK_URL / TEAMS_WEBHOOK_URL) — skipped.');
  process.exit(0);
}

for (const t of targets) {
  if (process.env.NOTIFY_DRY_RUN) {
    console.log(`[notify][dry-run] ${t.name}:\n${JSON.stringify(t.body, null, 2)}`);
    continue;
  }
  try {
    const res = await fetch(t.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(t.body) });
    console.log(`[notify] ${t.name}: HTTP ${res.status}`);
  } catch (err) {
    // Alerting must never break the pipeline
    console.warn(`[notify] ${t.name} failed: ${err.message}`);
  }
}
