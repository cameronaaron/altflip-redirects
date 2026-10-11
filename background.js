// SPDX-FileCopyrightText: 2026 Cameron Aaron
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { buildRules, defaultInstances } from './services.js';

// Fill in defaults without overwriting choices: onInstalled also fires on
// every extension update.
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(['instances', 'enabled']);
  await chrome.storage.sync.set({
    instances: { ...defaultInstances(), ...stored.instances },
    enabled: stored.enabled ?? true
  });
  await updateRules();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.instances || changes.enabled)) updateRules();
});

// Updates run one after another so the last settings written always win; a
// change arriving mid-update is queued, not dropped.
let pending = Promise.resolve();

export function updateRules() {
  pending = pending.then(applyRules).catch(error => {
    console.error('Updating redirect rules failed:', error);
  });
  return pending;
}

async function applyRules() {
  const { instances, enabled = true } = await chrome.storage.sync.get(['instances', 'enabled']);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(rule => rule.id),
    addRules: enabled ? buildRules(instances) : []
  });
}
