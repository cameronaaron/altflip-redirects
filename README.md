# AltFlip Redirects

A Manifest V3 Chrome extension that redirects social media and content sites
to privacy-friendly alternative frontends. It collects nothing: no telemetry,
no network calls of its own, settings kept in Chrome sync storage.

| Service | Frontends (first is the default) |
|---|---|
| Twitter/X | xcancel.com, nitter.tiekoetter.com, nitter.net |
| YouTube | piped.video, piped.kavin.rocks, invidious.projectsegfau.lt |
| Medium | scribe.rip |
| Quora | quetre.pussthecat.org |
| IMDb | libremdb.iket.me, libremdb.pussthecat.org |
| Fandom | breezewiki.com |
| Reddit | safereddit.com |
| TikTok | proxitok.pussthecat.org |
| Imgur | rimgo.pussthecat.org |

Redirects are `declarativeNetRequest` rules, so Chrome applies them before the
page loads and the service worker only wakes when settings change. Covered:
`www.`/`m.`/`mobile.` subdomains, `youtu.be` links and YouTube Shorts (both
become `/watch?v=` URLs), Medium custom subdomains, regional Quora, and
Fandom wiki subdomains. Services whose host is swapped also lose 26 tracking
parameters (`utm_*`, `fbclid`, `gclid`, …); YouTube and Fandom URLs are
rewritten whole and keep their query, so timestamps and playlists survive.

Instances come and go; if one stops working, pick another in the settings.

## Install

The Chrome Web Store listing was submitted for review in December 2025. Until
it is live, load it unpacked:

1. Clone this repository.
2. Open `chrome://extensions/` and turn on Developer mode.
3. Click **Load unpacked** and select the repository folder.

## Use

The toolbar popup turns redirects on and off. **Configure Instances** opens
the settings page, where you choose an instance per service and press
**Save Settings**; the on/off switch there saves immediately.

## Develop

Requires Node 20 or newer; there are no dependencies.

```sh
npm test          # rule and service-worker tests (node --test)
npm run package   # altflip-redirects.zip for the Web Store (about 10 KB)
```

Everything a service needs lives in `services.js`: its instances (the first is
the default) and its rules. A rule with no `substitution` swaps the host; one
with `substitution` rewrites the whole URL. To add a service, add an entry
there, add its domains to `host_permissions` in `manifest.json`, and add a
case to `test/rules.test.js`. A test fails if a redirected site is missing
from `host_permissions`.

## License

[AGPL-3.0-or-later](LICENSE).
