import type { OutputFormat } from '../shared/constants';
import type { StateResponseMessage } from '../types/messages';

export interface PopupViewModel {
  convertedCount: number;
  convertedLabel: string;
  enabled: boolean;
  outputFormat: OutputFormat;
  statusDetail: string;
  statusTitle: string;
  statusTone: 'active' | 'disabled';
}

export function createPopupViewModel(state: StateResponseMessage): PopupViewModel {
  return {
    convertedCount: state.convertedCount,
    convertedLabel: state.convertedCount === 1 ? 'file converted' : 'files converted',
    enabled: state.enabled,
    outputFormat: state.outputFormat,
    statusDetail: state.lastStatus.detail,
    statusTitle: state.lastStatus.title,
    statusTone: !state.enabled || state.lastStatus.kind === 'error' ? 'disabled' : 'active',
  };
}
