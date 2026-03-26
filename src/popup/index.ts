import type { StateResponseMessage } from '../types/messages';
import type { OutputFormat } from '../shared/constants';

const toggle = document.getElementById('enabled-toggle') as HTMLInputElement;
const statusText = document.getElementById('status-text') as HTMLParagraphElement;
const convertedCount = document.getElementById('converted-count') as HTMLSpanElement;
const convertedLabel = document.getElementById('converted-label') as HTMLSpanElement;
const formatPng = document.getElementById('format-png') as HTMLInputElement;
const formatJpeg = document.getElementById('format-jpeg') as HTMLInputElement;
const formatPngCard = document.getElementById('format-png-card') as HTMLLabelElement;
const formatJpegCard = document.getElementById('format-jpeg-card') as HTMLLabelElement;

// Load current state
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response: StateResponseMessage) => {
  if (response?.type === 'STATE_RESPONSE') {
    toggle.checked = response.enabled;
    updateConvertedCount(response.convertedCount);
    statusText.textContent = response.enabled ? 'Active' : 'Disabled';
    updateStatusStyle(response.enabled);
    setFormat(response.outputFormat);
  }
});

// Handle toggle
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED', enabled });
  statusText.textContent = enabled ? 'Active' : 'Disabled';
  updateStatusStyle(enabled);
});

// Handle format selection
formatPng.addEventListener('change', () => {
  if (formatPng.checked) {
    sendFormat('image/png');
    updateFormatCards('image/png');
  }
});

formatJpeg.addEventListener('change', () => {
  if (formatJpeg.checked) {
    sendFormat('image/jpeg');
    updateFormatCards('image/jpeg');
  }
});

function setFormat(format: OutputFormat): void {
  if (format === 'image/jpeg') {
    formatJpeg.checked = true;
  } else {
    formatPng.checked = true;
  }
  updateFormatCards(format);
}

function sendFormat(format: OutputFormat): void {
  chrome.runtime.sendMessage({ type: 'SET_FORMAT', outputFormat: format });
}

function updateFormatCards(format: OutputFormat): void {
  formatPngCard.classList.toggle('selected', format === 'image/png');
  formatJpegCard.classList.toggle('selected', format === 'image/jpeg');
}

function updateStatusStyle(enabled: boolean): void {
  document.body.classList.toggle('is-enabled', enabled);
  statusText.classList.toggle('active', enabled);
  statusText.classList.toggle('disabled', !enabled);
}

function updateConvertedCount(count: number): void {
  convertedCount.textContent = String(count);
  convertedLabel.textContent = count === 1 ? 'file converted' : 'files converted';
}
