// SPDX-FileCopyrightText: 2026 Cameron Aaron
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SERVICES, TRACKING_PARAMS, buildRules, chosenInstance, defaultInstances } from '../services.js';

// Applies rules the way declarativeNetRequest does: the highest-priority
// matching rule wins; a substitution fills \N from the filter's groups (an
// unmatched group becomes empty), a transform swaps the host and drops params.
function redirect(rules, url) {
  const matches = rules
    .map(rule => ({ rule, m: new RegExp(rule.condition.regexFilter).exec(url) }))
    .filter(({ m }) => m)
    .sort((a, b) => b.rule.priority - a.rule.priority);
  if (!matches.length) return null;
  const { rule, m } = matches[0];
  const { regexSubstitution, transform } = rule.action.redirect;
  if (regexSubstitution) return regexSubstitution.replace(/\\(\d)/g, (_, n) => m[n] ?? '');
  const out = new URL(url);
  out.host = transform.host;
  for (const p of transform.queryTransform.removeParams) out.searchParams.delete(p);
  return out.href;
}

const defaults = buildRules(undefined);

const CASES = [
  ['https://x.com/user/status/1?utm_source=a&s=20', 'https://xcancel.com/user/status/1?s=20'],
  ['https://mobile.twitter.com/user', 'https://xcancel.com/user'],
  ['https://www.youtube.com/watch?v=abc&t=42&list=L', 'https://piped.video/watch?v=abc&t=42&list=L'],
  ['https://m.youtube.com/shorts/abc_-1', 'https://piped.video/watch?v=abc_-1'],
  ['https://youtu.be/abc', 'https://piped.video/watch?v=abc&'],
  ['https://user.medium.com/a-post-123?source=x&fbclid=y', 'https://scribe.rip/a-post-123?source=x'],
  ['https://es.quora.com/Question', 'https://quetre.pussthecat.org/Question'],
  ['https://m.imdb.com/title/tt0111161/?ref_=x', 'https://libremdb.iket.me/title/tt0111161/?ref_=x'],
  ['https://minecraft.fandom.com/wiki/Creeper', 'https://breezewiki.com/minecraft/wiki/Creeper'],
  ['https://old.reddit.com/r/rust/?ref=share', 'https://safereddit.com/r/rust/'],
  ['https://vm.tiktok.com/ZM123/', 'https://proxitok.pussthecat.org/ZM123/'],
  ['https://i.imgur.com/abc.png', 'https://rimgo.pussthecat.org/abc.png']
];

test('each supported URL redirects to its default instance', () => {
  for (const [from, to] of CASES) assert.equal(redirect(defaults, from), to, from);
});

test('youtu.be keeps its query as further parameters, not a second "?"', () => {
  assert.equal(redirect(defaults, 'https://youtu.be/abc?t=10&si=x'), 'https://piped.video/watch?v=abc&t=10&si=x');
});

test('unrelated URLs are left alone', () => {
  for (const url of ['https://example.com/', 'https://notyoutube.com/watch', 'https://fandom.com/']) {
    assert.equal(redirect(defaults, url), null, url);
  }
});

test('a chosen instance is used, and an unknown one falls back to the default', () => {
  const rules = buildRules({ youtube: 'piped.kavin.rocks', twitter: 'gone.example' });
  assert.equal(redirect(rules, 'https://youtube.com/feed'), 'https://piped.kavin.rocks/feed');
  assert.equal(redirect(rules, 'https://x.com/a'), 'https://xcancel.com/a');
  assert.equal(chosenInstance('twitter', null), 'xcancel.com');
});

test('rule ids are unique and every rule matches main frames only', () => {
  const ids = defaults.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of defaults) assert.deepEqual(r.condition.resourceTypes, ['main_frame']);
});

test('the YouTube timestamp and playlist params are never stripped', () => {
  for (const p of ['t', 'list', 'v']) assert.ok(!TRACKING_PARAMS.includes(p), p);
});

test('every default instance is one of the offered instances', () => {
  for (const [key, host] of Object.entries(defaultInstances())) {
    assert.ok(SERVICES[key].instances.includes(host), key);
  }
});

// A redirect needs host access to the page being left, so every source URL
// above has to be covered by a manifest host permission.
test('the manifest grants host access to every redirected site', () => {
  const { host_permissions } = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
  const covers = (pattern, host) => {
    const h = pattern.match(/^\*:\/\/([^/]+)\/\*$/)[1];
    return h.startsWith('*.') ? host.endsWith(h.slice(1)) : host === h;
  };
  for (const [from] of CASES) {
    const { host } = new URL(from);
    assert.ok(host_permissions.some(p => covers(p, host)), host);
  }
});
