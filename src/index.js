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
  // TODO: Task 3
}

export function parseAndValidate(body) {
  // TODO: Task 2
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
