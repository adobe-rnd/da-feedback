import { describe, it, expect } from 'vitest';
import { parseAndValidate } from '../src/index.js';

const validBody = {
  category: 'bug',
  message: 'Something broke',
  context: { org: 'myorg', site: 'mysite', path: '/my/page' },
  user: { email: 'user@adobe.com', imsId: 'abc123' },
};

describe('parseAndValidate', () => {
  it('returns the payload when all required fields are valid', () => {
    const result = parseAndValidate(validBody);
    expect(result).toEqual({ ...validBody, sessionId: undefined });
  });

  it('passes sessionId through when present', () => {
    const result = parseAndValidate({ ...validBody, sessionId: 'abc-123' });
    expect(result.sessionId).toBe('abc-123');
  });

  it('throws on missing category', () => {
    expect(() => parseAndValidate({ ...validBody, category: undefined }))
      .toThrow('category');
  });

  it('throws on empty category', () => {
    expect(() => parseAndValidate({ ...validBody, category: '' }))
      .toThrow('category');
  });

  it('throws on missing message', () => {
    expect(() => parseAndValidate({ ...validBody, message: undefined }))
      .toThrow('message');
  });

  it('throws on empty message', () => {
    expect(() => parseAndValidate({ ...validBody, message: '   ' }))
      .toThrow('message');
  });

  it('throws when message exceeds 2000 chars', () => {
    expect(() => parseAndValidate({ ...validBody, message: 'x'.repeat(2001) }))
      .toThrow('2000');
  });

  it('accepts message of exactly 2000 chars', () => {
    const result = parseAndValidate({ ...validBody, message: 'x'.repeat(2000) });
    expect(result.message).toHaveLength(2000);
  });

  it('throws when context is missing', () => {
    expect(() => parseAndValidate({ ...validBody, context: undefined }))
      .toThrow('context');
  });

  it('throws when context.org is missing', () => {
    expect(() => parseAndValidate({ ...validBody, context: { site: 'mysite', path: '/p' } }))
      .toThrow('context.org');
  });

  it('throws when context.site is missing', () => {
    expect(() => parseAndValidate({ ...validBody, context: { org: 'myorg', path: '/p' } }))
      .toThrow('context.site');
  });

  it('throws when context.path is missing', () => {
    expect(() => parseAndValidate({ ...validBody, context: { org: 'myorg', site: 'mysite' } }))
      .toThrow('context.path');
  });

  it('throws when sessionId is present but not a string', () => {
    expect(() => parseAndValidate({ ...validBody, sessionId: 42 }))
      .toThrow('sessionId');
  });

  it('accepts any non-empty string as category', () => {
    for (const cat of ['general', 'feature-request', 'bug', 'custom-type', 'anything']) {
      expect(() => parseAndValidate({ ...validBody, category: cat })).not.toThrow();
    }
  });

  it('includes user in the returned payload', () => {
    const result = parseAndValidate(validBody);
    expect(result.user).toEqual({ email: 'user@adobe.com', imsId: 'abc123' });
  });

  it('throws when user is missing', () => {
    const { user, ...rest } = validBody;
    expect(() => parseAndValidate(rest)).toThrow('user');
  });

  it('throws when user is not an object', () => {
    expect(() => parseAndValidate({ ...validBody, user: 'me@adobe.com' }))
      .toThrow('user');
  });

  it('throws when user.email is missing', () => {
    expect(() => parseAndValidate({ ...validBody, user: { imsId: 'abc123' } }))
      .toThrow('user.email');
  });

  it('throws when user.email is empty', () => {
    expect(() => parseAndValidate({ ...validBody, user: { email: '', imsId: 'abc123' } }))
      .toThrow('user.email');
  });

  it('throws when user.imsId is missing', () => {
    expect(() => parseAndValidate({ ...validBody, user: { email: 'user@adobe.com' } }))
      .toThrow('user.imsId');
  });

  it('throws when user.imsId is empty', () => {
    expect(() => parseAndValidate({ ...validBody, user: { email: 'user@adobe.com', imsId: '' } }))
      .toThrow('user.imsId');
  });
});
