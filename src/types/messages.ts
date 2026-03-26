import type { OutputFormat } from '../shared/constants';
import type { ConversionStatus } from '../shared/status';

export interface ConvertHeicMessage {
  type: 'CONVERT_HEIC';
  requestId: string;
  filename: string;
  outputFormat: OutputFormat;
}

export interface ConvertBulkZipMessage {
  type: 'CONVERT_BULK_ZIP';
  requestId: string;
  filename: string;
  outputFormat: OutputFormat;
}

export interface ConvertResultMessage {
  type: 'CONVERT_RESULT';
  requestId: string;
  filename: string;
}

export interface ConvertErrorMessage {
  type: 'CONVERT_ERROR';
  requestId: string;
  error: string;
  filename?: string;
}

export interface ZipResultMessage {
  type: 'ZIP_RESULT';
  requestId: string;
  filename: string;
  stats: {
    converted: number;
    skipped: number;
    passthrough: number;
  };
}

export interface CreateDownloadUrlMessage {
  type: 'CREATE_DOWNLOAD_URL';
  requestId: string;
  mimeType: string;
}

export interface DownloadUrlResultMessage {
  type: 'DOWNLOAD_URL_RESULT';
  requestId: string;
  url: string;
}

export interface RevokeDownloadUrlMessage {
  type: 'REVOKE_DOWNLOAD_URL';
  url: string;
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
  lastStatus: ConversionStatus;
  status: string;
}

export type ExtensionMessage =
  | ConvertHeicMessage
  | ConvertBulkZipMessage
  | ConvertResultMessage
  | ConvertErrorMessage
  | ZipResultMessage
  | CreateDownloadUrlMessage
  | DownloadUrlResultMessage
  | RevokeDownloadUrlMessage
  | ToggleEnabledMessage
  | SetFormatMessage
  | GetStateMessage
  | StateResponseMessage;
