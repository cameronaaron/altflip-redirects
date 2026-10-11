// SPDX-FileCopyrightText: 2026 Cameron Aaron
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Tracking parameters stripped from host-rewritten URLs. YouTube is rewritten
// by substitution and keeps its query untouched, so `t`, `list` and `start`
// survive there.
export const TRACKING_PARAMS = Object.freeze([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_name', 'gclid', 'fbclid', 'ref', 'si', 'feature',
  'spm', 'ved', 'ei', 'start', 'sxsrf', 'oq', 'aqs', 'sourceid',
  'uact', 'gs_l', '_hsenc', '_hsmi', 'mc_cid', 'mc_eid'
]);

// Each rule either swaps the host (keeping path and query, minus tracking
// params) or rewrites the URL through `substitution`, where `$HOST` is the
// chosen instance and `\N` is a capture group of `filter`.
export const SERVICES = Object.freeze({
  twitter: {
    name: 'Twitter/X',
    instances: ['xcancel.com', 'nitter.tiekoetter.com', 'nitter.net'],
    rules: [{ filter: '^https?://(?:www\\.|mobile\\.)?(?:x|twitter)\\.com/.*' }]
  },
  youtube: {
    name: 'YouTube',
    instances: ['piped.video', 'piped.kavin.rocks', 'invidious.projectsegfau.lt'],
    rules: [
      { filter: '^https?://(?:www\\.|m\\.)?youtube\\.com(/.*)', substitution: 'https://$HOST\\1' },
      {
        filter: '^https?://(?:www\\.)?youtu\\.be/([a-zA-Z0-9_-]+)(?:\\?(.*))?',
        substitution: 'https://$HOST/watch?v=\\1&\\2',
        priority: 2
      },
      {
        filter: '^https?://(?:www\\.|m\\.)?youtube\\.com/shorts/([a-zA-Z0-9_-]+)',
        substitution: 'https://$HOST/watch?v=\\1',
        priority: 2
      }
    ]
  },
  medium: {
    name: 'Medium',
    instances: ['scribe.rip'],
    rules: [{ filter: '^https?://(?:www\\.|[a-z0-9-]+\\.)?medium\\.com/.*' }]
  },
  quora: {
    name: 'Quora',
    instances: ['quetre.pussthecat.org'],
    rules: [{ filter: '^https?://(?:www\\.)?(?:[a-z]{2}\\.)?quora\\.com/.*' }]
  },
  imdb: {
    name: 'IMDb',
    instances: ['libremdb.iket.me', 'libremdb.pussthecat.org'],
    rules: [{ filter: '^https?://(?:www\\.)?(?:m\\.)?imdb\\.com/.*' }]
  },
  fandom: {
    name: 'Fandom',
    instances: ['breezewiki.com'],
    // BreezeWiki addresses a wiki as /<subdomain>/wiki/<page>.
    rules: [{
      filter: '^https?://([a-z0-9-]+)\\.fandom\\.com/wiki/(.*)',
      substitution: 'https://$HOST/\\1/wiki/\\2'
    }]
  },
  reddit: {
    name: 'Reddit',
    instances: ['safereddit.com'],
    rules: [{ filter: '^https?://(?:www\\.)?(?:old\\.)?(?:new\\.)?reddit\\.com/.*' }]
  },
  tiktok: {
    name: 'TikTok',
    instances: ['proxitok.pussthecat.org'],
    rules: [{ filter: '^https?://(?:www\\.)?(?:vm\\.)?(?:vt\\.)?tiktok\\.com/.*' }]
  },
  imgur: {
    name: 'Imgur',
    instances: ['rimgo.pussthecat.org'],
    rules: [{ filter: '^https?://(?:www\\.)?(?:i\\.)?(?:m\\.)?imgur\\.com/.*' }]
  }
});

// The first instance listed is the default.
export function defaultInstances() {
  return Object.fromEntries(Object.entries(SERVICES).map(([key, s]) => [key, s.instances[0]]));
}

// Falls back to the default for a stored instance that is no longer offered.
export function chosenInstance(key, stored) {
  const { instances } = SERVICES[key];
  return instances.includes(stored?.[key]) ? stored[key] : instances[0];
}

export function buildRules(stored) {
  const rules = [];
  for (const key of Object.keys(SERVICES)) {
    const host = chosenInstance(key, stored);
    for (const { filter, substitution, priority = 1 } of SERVICES[key].rules) {
      const redirect = substitution
        ? { regexSubstitution: substitution.replace('$HOST', host) }
        : { transform: { host, queryTransform: { removeParams: [...TRACKING_PARAMS] } } };
      rules.push({
        id: rules.length + 1,
        priority,
        action: { type: 'redirect', redirect },
        condition: { regexFilter: filter, resourceTypes: ['main_frame'] }
      });
    }
  }
  return rules;
}
