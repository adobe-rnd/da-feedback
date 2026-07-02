import { describe, it, expect } from 'vitest';
import { formatSlackMessage } from '../src/index.js';

const basePayload = {
  category: 'bug',
  message: 'The publish button is broken.',
  context: { org: 'myorg', site: 'mysite', path: '/content/page' },
  user: { email: 'user@adobe.com', imsId: 'abc123xyz' },
  sessionId: undefined,
};

describe('formatSlackMessage', () => {
  it('includes the category', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).toContain('*Category:* bug');
  });

  it('includes the message', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).toContain('*Message:* The publish button is broken.');
  });

  it('includes a DA Live link with correct URL', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).toContain('<https://da.live/#/myorg/mysite/content/page|DA Live>');
  });

  it('includes a Preview link with correct URL', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).toContain('<https://main--mysite--myorg.aem.page/content/page|Preview>');
  });

  it('omits the Session ID line when sessionId is undefined', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).not.toContain('Session ID');
  });

  it('omits the Session ID line when sessionId is absent', () => {
    const { sessionId, ...rest } = basePayload;
    const text = formatSlackMessage(rest);
    expect(text).not.toContain('Session ID');
  });

  it('includes the Session ID line when sessionId is present', () => {
    const text = formatSlackMessage({ ...basePayload, sessionId: 'abc-123-def' });
    expect(text).toContain('*Session ID:* abc-123-def');
  });

  it('includes the header emoji and title', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).toContain(':speech_balloon: *New DA/EW Feedback*');
  });

  it('constructs the DA Live URL correctly when path starts with /', () => {
    const text = formatSlackMessage({
      ...basePayload,
      context: { org: 'acme', site: 'main', path: '/index' },
    });
    // Should not double-slash: da.live/#/acme/main/index not da.live/#/acme/main//index
    expect(text).toContain('https://da.live/#/acme/main/index');
  });

  it('includes the user line with email and IMS ID combined', () => {
    const text = formatSlackMessage(basePayload);
    expect(text).toContain('*User:* user@adobe.com (IMS: abc123xyz)');
  });

  it('places user line after Open in and before Session ID', () => {
    const text = formatSlackMessage({ ...basePayload, sessionId: 'sess-1' });
    const openInPos = text.indexOf('*Open in:*');
    const userPos = text.indexOf('*User:*');
    const sessionPos = text.indexOf('*Session ID:*');
    expect(openInPos).toBeLessThan(userPos);
    expect(userPos).toBeLessThan(sessionPos);
  });
});
