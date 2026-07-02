import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index.js';

const ALLOWED_ORIGIN = 'https://da.live';
const WEBHOOK_URL = 'https://hooks.slack.com/test';

const baseEnv = {
  ALLOWED_ORIGINS: ALLOWED_ORIGIN,
  SLACK_WEBHOOK_URL: WEBHOOK_URL,
};

const validBody = {
  category: 'bug',
  message: 'Something is broken',
  context: { org: 'myorg', site: 'mysite', path: '/page' },
  user: { email: 'user@adobe.com', imsId: 'abc123' },
};

function makeRequest(method, pathname, body, origin = ALLOWED_ORIGIN) {
  const url = `https://da-feedback.workers.dev${pathname}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (origin) headers.set('Origin', origin);
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('fetch handler', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('CORS preflight (OPTIONS)', () => {
    it('returns 204 for OPTIONS from allowed origin', async () => {
      const req = makeRequest('OPTIONS', '/feedback', null);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    });

    it('returns 403 for OPTIONS from disallowed origin', async () => {
      const req = makeRequest('OPTIONS', '/feedback', null, 'https://evil.com');
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(403);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('routing', () => {
    it('returns 404 for GET /feedback', async () => {
      const req = makeRequest('GET', '/feedback', null);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(404);
    });

    it('returns 404 for POST /other', async () => {
      const req = makeRequest('POST', '/other', validBody);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('origin enforcement', () => {
    it('returns 403 when origin is not in ALLOWED_ORIGINS', async () => {
      const req = makeRequest('POST', '/feedback', validBody, 'https://evil.com');
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(403);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('validation errors', () => {
    it('returns 400 when category is invalid', async () => {
      const req = makeRequest('POST', '/feedback', { ...validBody, category: 'spam' });
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/category/i);
    });

    it('returns 400 when message is missing', async () => {
      const { message, ...rest } = validBody;
      const req = makeRequest('POST', '/feedback', rest);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(400);
    });

    it('returns 400 when context.org is missing', async () => {
      const req = makeRequest('POST', '/feedback', {
        ...validBody,
        context: { site: 'mysite', path: '/p' },
      });
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(400);
    });
  });

  describe('successful submission', () => {
    it('returns 200 { ok: true } on success', async () => {
      const req = makeRequest('POST', '/feedback', validBody);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true });
    });

    it('posts to SLACK_WEBHOOK_URL with correct payload', async () => {
      const req = makeRequest('POST', '/feedback', validBody);
      await worker.fetch(req, baseEnv);
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe(WEBHOOK_URL);
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body).toHaveProperty('text');
      expect(body.text).toContain('bug');
    });

    it('includes CORS headers in success response', async () => {
      const req = makeRequest('POST', '/feedback', validBody);
      const res = await worker.fetch(req, baseEnv);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    });

    it('includes sessionId in the Slack message when provided', async () => {
      const req = makeRequest('POST', '/feedback', { ...validBody, sessionId: 'sess-xyz' });
      await worker.fetch(req, baseEnv);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('sess-xyz');
    });
  });

  describe('Slack delivery failure', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('returns 502 when Slack webhook returns a non-2xx status', async () => {
      mockFetch.mockResolvedValue(new Response('bad', { status: 500 }));
      const req = makeRequest('POST', '/feedback', validBody);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toMatch(/slack/i);
    });

    it('returns 502 when Slack fetch rejects (network error)', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));
      const req = makeRequest('POST', '/feedback', validBody);
      const res = await worker.fetch(req, baseEnv);
      expect(res.status).toBe(502);
    });
  });
});
