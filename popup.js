// SPDX-FileCopyrightText: 2026 Cameron Aaron
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SERVICES } from './services.js';

const toggle = document.getElementById('enabled-toggle');
const status = document.getElementById('status');

const services = Object.values(SERVICES);
document.getElementById('service-count').textContent = services.length;
document.getElementById('instance-count').textContent =
  services.reduce((n, s) => n + s.instances.length, 0);

chrome.storage.sync.get(['enabled']).then(({ enabled = true }) => {
  toggle.checked = enabled;
});

// storage.sync caps writes per minute, so rapid toggling is coalesced.
let saveTimer;
toggle.addEventListener('change', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await chrome.storage.sync.set({ enabled: toggle.checked });
      status.style.display = 'block';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    } catch (error) {
      console.error('Saving the toggle failed:', error);
    }
  }, 100);
});

document.getElementById('options-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
