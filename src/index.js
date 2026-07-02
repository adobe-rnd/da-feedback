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
    .filter(Boolean)
    .map((o) => {
      if (o.startsWith('http://') || o.startsWith('https://')) return o;
      return o.startsWith('localhost') ? `http://${o}` : `https://${o}`;
    });

  if (!origin || !allowed.includes(origin)) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function parseAndValidate(body) {
  const { category, message, context, user, sessionId } = body || {};

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

  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw new Error('user is required and must be an object');
  }
  if (!user.email || typeof user.email !== 'string') {
    throw new Error('user.email is required and must be a non-empty string');
  }
  if (!user.imsId || typeof user.imsId !== 'string') {
    throw new Error('user.imsId is required and must be a non-empty string');
  }

  if (sessionId !== undefined && typeof sessionId !== 'string') {
    throw new Error('sessionId must be a string if provided');
  }

  return { category, message, context, user, sessionId };
}

export function formatSlackMessage({ category, message, context, user, sessionId }) {
  const { org, site, path } = context;
  const daUrl = `https://da.live/#/${org}/${site}${path}`;
  const previewUrl = `https://main--${site}--${org}.aem.page${path}`;

  let text = `:speech_balloon: *New DA/EW Feedback*\n\n`;
  text += `*Category:* ${category}\n`;
  text += `*Message:* ${message}\n\n`;
  text += `*Open in:* <${daUrl}|DA Live> · <${previewUrl}|Preview>\n\n`;
  text += `*User:* ${user.email} (IMS: ${user.imsId})`;

  if (sessionId) {
    text += `\n\n*Session ID:* ${sessionId}`;
  }

  return text;
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export async function postToSlack(text, env) {
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL is not configured');

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}`);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      const corsHeaders = checkCors(request, env);
      if (!corsHeaders) return jsonResponse({ error: 'Origin not allowed' }, 403);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Origin check for all other requests
    const corsHeaders = checkCors(request, env);
    if (!corsHeaders) return jsonResponse({ error: 'Origin not allowed' }, 403);

    // Route: only POST /feedback is valid
    if (request.method !== 'POST' || url.pathname !== '/feedback') {
      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    }

    // Parse and validate body
    let payload;
    try {
      const body = await request.json();
      payload = parseAndValidate(body);
    } catch (e) {
      return jsonResponse({ error: e.message }, 400, corsHeaders);
    }

    // Format and deliver to Slack
    try {
      const text = formatSlackMessage(payload);
      await postToSlack(text, env);
    } catch (e) {
      console.error('Slack delivery failed:', e.message);
      return jsonResponse({ error: 'Slack delivery failed' }, 502, corsHeaders);
    }

    return jsonResponse({ ok: true }, 200, corsHeaders);
  },
};
