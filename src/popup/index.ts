import type { StateResponseMessage } from '../types/messages';
import type { OutputFormat } from '../shared/constants';
import { createPopupViewModel } from './view-model';

const toggle = document.getElementById('enabled-toggle') as HTMLInputElement;
const statusText = document.getElementById('status-text') as HTMLParagraphElement;
const statusDetail = document.querySelector('.status-detail') as HTMLParagraphElement;
const convertedCount = document.getElementById('converted-count') as HTMLSpanElement;
const convertedLabel = document.getElementById('converted-label') as HTMLSpanElement;
const formatPng = document.getElementById('format-png') as HTMLInputElement;
const formatJpeg = document.getElementById('format-jpeg') as HTMLInputElement;
const formatPngCard = document.getElementById('format-png-card') as HTMLLabelElement;
const formatJpegCard = document.getElementById('format-jpeg-card') as HTMLLabelElement;

void loadState();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (
    changes.enabled ||
    changes.convertedCount ||
    changes.outputFormat ||
    changes.lastConversionStatus
  ) {
    void loadState();
  }
});

// Handle toggle

toggle.addEventListener('change', () => {
  void sendStateRequest({ type: 'TOGGLE_ENABLED', enabled: toggle.checked });
});

// Handle format selection
formatPng.addEventListener('change', () => {
  if (formatPng.checked) {
    void sendStateRequest({ type: 'SET_FORMAT', outputFormat: 'image/png' });
  }
});

formatJpeg.addEventListener('change', () => {
  if (formatJpeg.checked) {
    void sendStateRequest({ type: 'SET_FORMAT', outputFormat: 'image/jpeg' });
  }
});

async function loadState(): Promise<void> {
  await sendStateRequest({ type: 'GET_STATE' });
}

function applyState(state: StateResponseMessage): void {
  const viewModel = createPopupViewModel(state);

  toggle.checked = viewModel.enabled;
  statusText.textContent = viewModel.statusTitle;
  statusDetail.textContent = viewModel.statusDetail;
  updateConvertedCount(viewModel.convertedCount, viewModel.convertedLabel);
  updateStatusStyle(viewModel.enabled, viewModel.statusTone);
  setFormat(viewModel.outputFormat);
}

async function sendStateRequest(
  message:
    | { type: 'GET_STATE' }
    | { type: 'TOGGLE_ENABLED'; enabled: boolean }
    | { type: 'SET_FORMAT'; outputFormat: OutputFormat }
): Promise<void> {
  const response = await requestState(message);
  if (response) {
    applyState(response);
  }
}

function requestState(
  message:
    | { type: 'GET_STATE' }
    | { type: 'TOGGLE_ENABLED'; enabled: boolean }
    | { type: 'SET_FORMAT'; outputFormat: OutputFormat }
): Promise<StateResponseMessage | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: StateResponseMessage | undefined) => {
      if (chrome.runtime.lastError) {
        showRuntimeError(chrome.runtime.lastError.message ?? 'Unable to reach the PixShift background service.');
        resolve(null);
        return;
      }

      if (response?.type !== 'STATE_RESPONSE') {
        showRuntimeError('Unable to load PixShift status.');
        resolve(null);
        return;
      }

      resolve(response);
    });
  });
}

function showRuntimeError(detail: string): void {
  statusText.textContent = 'Unavailable';
  statusDetail.textContent = detail;
  updateStatusStyle(false, 'disabled');
}

function setFormat(format: OutputFormat): void {
  if (format === 'image/jpeg') {
    formatJpeg.checked = true;
  } else {
    formatPng.checked = true;
  }

  updateFormatCards(format);
}

function updateFormatCards(format: OutputFormat): void {
  formatPngCard.classList.toggle('selected', format === 'image/png');
  formatJpegCard.classList.toggle('selected', format === 'image/jpeg');
}

function updateStatusStyle(enabled: boolean, tone: 'active' | 'disabled'): void {
  document.body.classList.toggle('is-enabled', enabled);
  statusText.classList.toggle('active', tone === 'active');
  statusText.classList.toggle('disabled', tone === 'disabled');
}

function updateConvertedCount(count: number, label: string): void {
  convertedCount.textContent = String(count);
  convertedLabel.textContent = label;
}
