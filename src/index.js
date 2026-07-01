/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const VALID_CATEGORIES = ['general', 'feature-request', 'bug', 'question', 'other'];

export function checkCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (!origin || !allowed.includes(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function parseAndValidate(body) {
  const { category, message, context, sessionId } = body || {};

  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('message is required and must be a non-empty string');
  }
  if (message.length > 2000) {
    throw new Error('message must be 2000 characters or fewer');
  }

  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new Error('context is required and must be an object');
  }
  if (!context.org || typeof context.org !== 'string') {
    throw new Error('context.org is required and must be a non-empty string');
  }
  if (!context.site || typeof context.site !== 'string') {
    throw new Error('context.site is required and must be a non-empty string');
  }
  if (!context.path || typeof context.path !== 'string') {
    throw new Error('context.path is required and must be a non-empty string');
  }

  if (sessionId !== undefined && typeof sessionId !== 'string') {
    throw new Error('sessionId must be a string if provided');
  }

  return { category, message, context, sessionId };
}

export function formatSlackMessage(payload) {
  // TODO: Task 4
}

export async function postToSlack(text, env) {
  // TODO: Task 5
}

export default {
  async fetch(request, env) {
    // TODO: Task 5
    return new Response('not implemented', { status: 501 });
  },
};
