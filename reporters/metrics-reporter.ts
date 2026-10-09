// =============================================================================
// reporters/metrics-reporter.ts — QA metrics for every run
// =============================================================================
// Produces, in ./metrics:
//   summary.json   machine-readable KPIs (consumed by notify + CI summary)
//   summary.md     human-readable table (pushed to $GITHUB_STEP_SUMMARY in CI)
//   history.jsonl  one line per run (local trend; CI keeps runs as artifacts)
//
// KPIs: pass rate, duration, flaky tests (passed on retry), known defects
// (test.fail() reproductions), slowest tests, and SCENARIO/RISK COVERAGE — the
// share of catalogued scenarios (catalog/scenarios.json) that have an
// automated test executed in this run. This is test coverage of risks, NOT
// code coverage (SauceDemo's source is not instrumented here).
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

type Scenario = { id: string; area: string; risk: 'high' | 'medium' | 'low'; automated: boolean };
type Row = {
  ids: string[];
  title: string;
  file: string;
  project: string;
  tags: string[];
  outcome: ReturnType<TestCase['outcome']>;
  status: TestResult['status'];
  durationMs: number;
  retries: number;
};

const ID_PATTERN = /\b([A-Z][A-Z0-9]{1,5}-\d{3})[a-z]?\b/g;

export default class MetricsReporter implements Reporter {
  private byId = new Map<string, Row>();
  private startedAt = Date.now();
  private outputDir: string;
  private catalogFile: string;

  constructor(options: { outputDir?: string; catalogFile?: string } = {}) {
    this.outputDir = options.outputDir ?? 'metrics';
    this.catalogFile = options.catalogFile ?? 'catalog/scenarios.json';
  }

  private target: string | null = null;

  onBegin(config: FullConfig, _suite: Suite): void {
    this.startedAt = Date.now();
    // A config can describe its target in `metadata` (see playwright.toolshop.config.ts)
    const meta = config.metadata as { app?: string; environment?: string; ui?: string } | undefined;
    if (meta?.ui) this.target = `${meta.app ?? 'app'} ${meta.environment ?? ''} — ${meta.ui}`.replace(/\s+/g, ' ');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Called once per attempt: the last call carries the final outcome
    // (test.outcome() is "flaky" when an attempt failed and a retry passed).
    this.byId.set(test.id, {
      ids: [...new Set([...test.title.matchAll(ID_PATTERN)].map((m) => m[1]))],
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      project: test.parent.project()?.name ?? 'default',
      tags: test.tags,
      outcome: test.outcome(),
      status: result.status,
      durationMs: result.duration,
      retries: result.retry,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const rows = [...this.byId.values()];
    const count = (o: Row['outcome']) => rows.filter((r) => r.outcome === o).length;
    const knownDefects = rows.filter((r) => r.outcome === 'expected' && r.status === 'failed');
    const passed = rows.filter((r) => r.outcome === 'expected' && r.status === 'passed').length;
    const flaky = count('flaky');
    const failed = count('unexpected');
    const skipped = count('skipped');
    const executed = rows.length - skipped;
    const passRate = executed ? Math.round(((passed + flaky + knownDefects.length) / executed) * 1000) / 10 : 0;

    // Scenario / risk coverage
    let coverage: Record<string, unknown> | null = null;
    if (fs.existsSync(this.catalogFile)) {
      const scenarios: Scenario[] = JSON.parse(fs.readFileSync(this.catalogFile, 'utf8')).scenarios;
      const executedIds = new Set(rows.filter((r) => r.outcome !== 'skipped').flatMap((r) => r.ids));
      const failingIds = new Set(rows.filter((r) => r.outcome === 'unexpected').flatMap((r) => r.ids));
      const byRisk = (risk: Scenario['risk']) => {
        const list = scenarios.filter((s) => s.risk === risk);
        const covered = list.filter((s) => executedIds.has(s.id)).length;
        return { total: list.length, executed: covered, pct: list.length ? Math.round((covered / list.length) * 100) : 0 };
      };
      const areas = [...new Set(scenarios.map((s) => s.area))].map((area) => {
        const list = scenarios.filter((s) => s.area === area);
        return { area, total: list.length, executed: list.filter((s) => executedIds.has(s.id)).length };
      });
      coverage = {
        scenarios: scenarios.length,
        automated: scenarios.filter((s) => s.automated).length,
        executedThisRun: scenarios.filter((s) => executedIds.has(s.id)).length,
        failingScenarios: [...failingIds],
        byRisk: { high: byRisk('high'), medium: byRisk('medium'), low: byRisk('low') },
        byArea: areas,
      };
    }

    const summary = {
      timestamp: new Date().toISOString(),
      status: result.status,
      baseURL: this.target ?? process.env.BASE_URL ?? (process.env.LOCAL_SAUCEDEMO ? 'local SauceDemo build' : 'https://www.saucedemo.com'),
      commit: process.env.GITHUB_SHA ?? null,
      runUrl: process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
      durationSec: Math.round((Date.now() - this.startedAt) / 100) / 10,
      totals: { tests: rows.length, executed, passed, failed, flaky, skipped, knownDefects: knownDefects.length },
      passRate,
      flakyTests: rows.filter((r) => r.outcome === 'flaky').map((r) => `${r.project} › ${r.title}`),
      failedTests: rows.filter((r) => r.outcome === 'unexpected').map((r) => `${r.project} › ${r.title}`),
      knownDefects: knownDefects.map((r) => r.title),
      slowest: [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5).map((r) => ({ title: r.title, ms: r.durationMs })),
      coverage,
    };

    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(path.join(this.outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(this.outputDir, 'summary.md'), toMarkdown(summary));
    fs.appendFileSync(
      path.join(this.outputDir, 'history.jsonl'),
      JSON.stringify({ t: summary.timestamp, status: summary.status, passRate, ...summary.totals, durationSec: summary.durationSec }) + '\n',
    );
  }

  printsToStdio(): boolean {
    return false;
  }
}

function toMarkdown(s: {
  status: string;
  baseURL: string;
  durationSec: number;
  passRate: number;
  totals: Record<string, number>;
  failedTests: string[];
  flakyTests: string[];
  knownDefects: string[];
  coverage: Record<string, unknown> | null;
}): string {
  const icon = s.status === 'passed' ? '✅' : '❌';
  const lines = [
    `## ${icon} Playwright Showroom — ${s.status.toUpperCase()}`,
    '',
    `Target: \`${s.baseURL}\` · Duration: **${s.durationSec}s** · Pass rate: **${s.passRate}%**`,
    '',
    '| Executed | Passed | Failed | Flaky | Known defects (test.fail) | Skipped |',
    '|---:|---:|---:|---:|---:|---:|',
    `| ${s.totals.executed} | ${s.totals.passed} | ${s.totals.failed} | ${s.totals.flaky} | ${s.totals.knownDefects} | ${s.totals.skipped} |`,
  ];
  const cov = s.coverage as { scenarios: number; executedThisRun: number; byRisk: Record<string, { total: number; executed: number; pct: number }> } | null;
  if (cov) {
    lines.push('', `**Scenario coverage (risk-based, not code coverage):** ${cov.executedThisRun}/${cov.scenarios} catalogued scenarios executed`, '');
    lines.push('| Risk | Executed / total | % |', '|---|---:|---:|');
    for (const [risk, v] of Object.entries(cov.byRisk)) lines.push(`| ${risk} | ${v.executed}/${v.total} | ${v.pct}% |`);
  }
  if (s.failedTests.length) lines.push('', '### ❌ Failed', ...s.failedTests.map((t) => `- ${t}`));
  if (s.flakyTests.length) lines.push('', '### ⚠️ Flaky (passed on retry)', ...s.flakyTests.map((t) => `- ${t}`));
  if (s.knownDefects.length) lines.push('', '### 🐞 Known defects reproduced', ...s.knownDefects.map((t) => `- ${t}`));
  return lines.join('\n') + '\n';
}
