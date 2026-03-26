import assert from 'node:assert/strict';
import test from 'node:test';
import { createPopupViewModel } from '../src/popup/view-model';
import type { StateResponseMessage } from '../src/types/messages';

function createState(overrides: Partial<StateResponseMessage> = {}): StateResponseMessage {
  return {
    type: 'STATE_RESPONSE',
    convertedCount: 0,
    enabled: true,
    lastStatus: {
      detail: 'Auto-convert downloaded HEIC files instantly.',
      kind: 'idle',
      title: 'Active',
      updatedAt: 0,
    },
    outputFormat: 'image/png',
    status: 'Active',
    ...overrides,
  };
}

test('popup view model shows singular label for one conversion', () => {
  const model = createPopupViewModel(createState({ convertedCount: 1 }));

  assert.equal(model.convertedLabel, 'file converted');
  assert.equal(model.statusTone, 'active');
});

test('popup view model uses disabled tone for errors and disabled state', () => {
  const errorModel = createPopupViewModel(
    createState({
      lastStatus: {
        detail: 'Original file downloaded',
        kind: 'error',
        title: 'Conversion failed',
        updatedAt: 1,
      },
    })
  );

  const disabledModel = createPopupViewModel(
    createState({
      enabled: false,
      lastStatus: {
        detail: 'PixShift will pass downloads through unchanged.',
        kind: 'idle',
        title: 'Disabled',
        updatedAt: 0,
      },
      status: 'Disabled',
    })
  );

  assert.equal(errorModel.statusTone, 'disabled');
  assert.equal(disabledModel.statusTone, 'disabled');
});
