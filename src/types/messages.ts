import type { OutputFormat } from '../shared/constants';

export interface ConvertHeicMessage {
  type: 'CONVERT_HEIC';
  heicBase64: string;
  filename: string;
  outputFormat: OutputFormat;
}

export interface ConvertBulkZipMessage {
  type: 'CONVERT_BULK_ZIP';
  zipBase64: string;
  filename: string;
  outputFormat: OutputFormat;
}

export interface ConvertResultMessage {
  type: 'CONVERT_RESULT';
  convertedBase64: string;
  filename: string;
}

export interface ConvertErrorMessage {
  type: 'CONVERT_ERROR';
  error: string;
  filename: string;
}

export interface ZipResultMessage {
  type: 'ZIP_RESULT';
  zipBase64: string;
  filename: string;
  stats: {
    converted: number;
    skipped: number;
    passthrough: number;
  };
}

export interface ToggleEnabledMessage {
  type: 'TOGGLE_ENABLED';
  enabled: boolean;
}

export interface SetFormatMessage {
  type: 'SET_FORMAT';
  outputFormat: OutputFormat;
}

export interface GetStateMessage {
  type: 'GET_STATE';
}

export interface StateResponseMessage {
  type: 'STATE_RESPONSE';
  enabled: boolean;
  convertedCount: number;
  outputFormat: OutputFormat;
  status: string;
}

export type ExtensionMessage =
  | ConvertHeicMessage
  | ConvertBulkZipMessage
  | ConvertResultMessage
  | ConvertErrorMessage
  | ZipResultMessage
  | ToggleEnabledMessage
  | SetFormatMessage
  | GetStateMessage
  | StateResponseMessage;
