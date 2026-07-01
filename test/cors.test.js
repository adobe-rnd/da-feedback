import { describe, it, expect } from 'vitest';
import { checkCors } from '../src/index.js';

function makeRequest(origin) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  return { headers };
}

function makeEnv(origins) {
  return { ALLOWED_ORIGINS: origins };
}

describe('checkCors', () => {
  it('returns CORS headers when origin is in ALLOWED_ORIGINS', () => {
    const req = makeRequest('https://da.live');
    const env = makeEnv('https://da.live,https://adobe.com');
    const headers = checkCors(req, env);
    expect(headers).not.toBeNull();
    expect(headers['Access-Control-Allow-Origin']).toBe('https://da.live');
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type');
  });

  it('matches the second origin in a comma-separated list', () => {
    const req = makeRequest('https://adobe.com');
    const env = makeEnv('https://da.live,https://adobe.com');
    const headers = checkCors(req, env);
    expect(headers?.['Access-Control-Allow-Origin']).toBe('https://adobe.com');
  });

  it('trims whitespace around origins in the env var', () => {
    const req = makeRequest('https://da.live');
    const env = makeEnv('  https://da.live  ,  https://adobe.com  ');
    expect(checkCors(req, env)).not.toBeNull();
  });

  it('returns null when origin is not in the allowed list', () => {
    const req = makeRequest('https://evil.com');
    const env = makeEnv('https://da.live');
    expect(checkCors(req, env)).toBeNull();
  });

  it('returns null when request has no Origin header', () => {
    const req = makeRequest(null);
    const env = makeEnv('https://da.live');
    expect(checkCors(req, env)).toBeNull();
  });

  it('returns null when ALLOWED_ORIGINS is empty', () => {
    const req = makeRequest('https://da.live');
    const env = makeEnv('');
    expect(checkCors(req, env)).toBeNull();
  });

  it('returns null when ALLOWED_ORIGINS is not set', () => {
    const req = makeRequest('https://da.live');
    expect(checkCors(req, {})).toBeNull();
  });

  it('does not echo a wildcard — echoes the exact request origin', () => {
    const req = makeRequest('https://da.live');
    const env = makeEnv('https://da.live');
    const headers = checkCors(req, env);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://da.live');
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
  });
});
