// =============================================================================
// utils/env.ts — Single source of truth for runtime configuration
// =============================================================================
// Every external setting comes from environment variables (or a local .env
// file, see .env.example). Nothing secret is ever hard-coded.
//
// The SauceDemo demo accounts are PUBLIC credentials documented on the login
// page of www.saucedemo.com — they are test data, not secrets.
// =============================================================================

import 'dotenv/config';

const LIVE_URL = 'https://www.saucedemo.com';

function flag(name: string): boolean {
  return ['1', 'true', 'yes'].includes((process.env[name] ?? '').toLowerCase());
}

export const LOCAL_PORT = Number(process.env.LOCAL_SAUCEDEMO_PORT ?? 4173);

/** true => tests run against a local build of the official SauceDemo sources. */
export const IS_LOCAL_TARGET = flag('LOCAL_SAUCEDEMO');

export const BASE_URL = (
  process.env.BASE_URL ?? (IS_LOCAL_TARGET ? `http://127.0.0.1:${LOCAL_PORT}` : LIVE_URL)
).replace(/\/$/, '');

/** Host name used to inject the session cookie (fast authentication). */
export const BASE_HOST = new URL(BASE_URL).hostname;

export const IS_CI = flag('CI');

/** Default password shared by all public SauceDemo demo accounts. */
export const DEMO_PASSWORD = process.env.SAUCE_PASSWORD ?? 'secret_sauce';
