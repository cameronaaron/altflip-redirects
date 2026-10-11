// SPDX-FileCopyrightText: 2026 Cameron Aaron
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from 'node:test';
import assert from 'node:assert/strict';

// A minimal chrome.* with storage and declarativeNetRequest that yield to the
// event loop on every call, so interleavings are real.
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const listeners = { installed: [], changed: [] };
let store = {};
let dynamicRules = [];
let afterRead = () => {};

globalThis.chrome = {
  runtime: { onInstalled: { addListener: fn => listeners.installed.push(fn) } },
  storage: {
    onChanged: { addListener: fn => listeners.changed.push(fn) },
    sync: {
      async get(keys) {
        await tick();
        const values = Object.fromEntries(keys.filter(k => k in store).map(k => [k, structuredClone(store[k])]));
        afterRead();
        return values;
      },
      async set(values) {
        await tick();
        Object.assign(store, structuredClone(values));
      }
    }
  },
  declarativeNetRequest: {
    async getDynamicRules() { await tick(); return dynamicRules; },
    async updateDynamicRules({ removeRuleIds, addRules = [] }) {
      await tick();
      dynamicRules = dynamicRules.filter(r => !removeRuleIds.includes(r.id)).concat(addRules);
    }
  }
};

const { updateRules } = await import('../background.js');
const install = () => Promise.all(listeners.installed.map(fn => fn({ reason: 'update' })));
const hostFor = name => dynamicRules.find(r => r.condition.regexFilter.includes(name))?.action.redirect;

test('installing fills in defaults and enables redirects', async () => {
  store = {};
  await install();
  assert.equal(store.enabled, true);
  assert.equal(store.instances.youtube, 'piped.video');
  assert.ok(dynamicRules.length > 0);
});

test('an extension update keeps the user\'s choices', async () => {
  store = { instances: { youtube: 'piped.kavin.rocks' }, enabled: false };
  await install();
  assert.equal(store.instances.youtube, 'piped.kavin.rocks');
  assert.equal(store.instances.twitter, 'xcancel.com');
  assert.equal(store.enabled, false);
  assert.deepEqual(dynamicRules, []);
});

test('a change made while rules are updating is applied, not dropped', async () => {
  store = { instances: {}, enabled: true };
  // The change lands after the first update has read the old settings,
  // which is the window a busy-flag guard would ignore.
  const read = new Promise(resolve => { afterRead = resolve; });
  const first = updateRules();
  await read;
  afterRead = () => {};
  store.instances = { twitter: 'nitter.net' };
  const second = updateRules();
  await Promise.all([first, second]);
  assert.equal(hostFor('twitter').transform.host, 'nitter.net');
});

test('disabling removes every dynamic rule, whatever its id', async () => {
  dynamicRules = [{ id: 99 }];
  store = { instances: {}, enabled: false };
  await updateRules();
  assert.deepEqual(dynamicRules, []);
});
