import type { StateResponseMessage } from '../types/messages';

const toggle = document.getElementById('enabled-toggle') as HTMLInputElement;
const statusText = document.getElementById('status-text') as HTMLParagraphElement;
const convertedCount = document.getElementById('converted-count') as HTMLSpanElement;

// Load current state
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response: StateResponseMessage) => {
  if (response?.type === 'STATE_RESPONSE') {
    toggle.checked = response.enabled;
    convertedCount.textContent = String(response.convertedCount);
    statusText.textContent = response.enabled ? 'Active' : 'Disabled';
    updateStatusStyle(response.enabled);
  }
});

// Handle toggle
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED', enabled });
  statusText.textContent = enabled ? 'Active' : 'Disabled';
  updateStatusStyle(enabled);
});

function updateStatusStyle(enabled: boolean): void {
  statusText.classList.toggle('active', enabled);
  statusText.classList.toggle('disabled', !enabled);
}
