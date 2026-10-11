// SPDX-FileCopyrightText: 2026 Cameron Aaron
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SERVICES, chosenInstance } from './services.js';

function renderService(key, service, selected) {
  const serviceDiv = document.createElement('div');
  serviceDiv.className = 'service';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'service-name';
  nameDiv.textContent = service.name;
  serviceDiv.appendChild(nameDiv);

  const grid = document.createElement('div');
  grid.className = 'instance-grid';

  for (const instance of service.instances) {
    const option = document.createElement('div');
    option.className = 'instance-option';
    option.classList.toggle('selected', instance === selected);

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = key;
    radio.value = instance;
    radio.id = `${key}-${instance}`;
    radio.checked = instance === selected;

    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.textContent = instance;

    option.append(radio, label);
    // The whole tile is the click target, not just the radio and label.
    option.addEventListener('click', e => {
      if (e.target !== radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    });
    radio.addEventListener('change', () => {
      for (const tile of grid.children) tile.classList.remove('selected');
      if (radio.checked) option.classList.add('selected');
    });
    grid.appendChild(option);
  }

  serviceDiv.appendChild(grid);
  return serviceDiv;
}

async function loadSettings() {
  try {
    const { instances, enabled = true } = await chrome.storage.sync.get(['instances', 'enabled']);
    document.getElementById('enabled-toggle').checked = enabled;
    const container = document.getElementById('services-container');
    container.replaceChildren(
      ...Object.entries(SERVICES).map(([key, s]) => renderService(key, s, chosenInstance(key, instances)))
    );
  } catch (error) {
    console.error('Loading settings failed:', error);
    showStatus('Failed to load settings. Please refresh the page.', 'error');
  }
}

async function saveSettings() {
  const enabled = document.getElementById('enabled-toggle').checked;
  const instances = {};
  for (const key of Object.keys(SERVICES)) {
    const selected = document.querySelector(`input[name="${key}"]:checked`);
    instances[key] = selected ? selected.value : chosenInstance(key, {});
  }
  try {
    await chrome.storage.sync.set({ instances, enabled });
    showStatus('Settings saved.', 'success');
  } catch (error) {
    console.error('Saving settings failed:', error);
    showStatus(`Failed to save settings: ${error.message}`, 'error');
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => { status.style.display = 'none'; }, 3000);
}

loadSettings();
document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('enabled-toggle').addEventListener('change', saveSettings);
