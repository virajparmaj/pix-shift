export interface ConvertHeicMessage {
  type: 'CONVERT_HEIC';
  heicBase64: string;
  filename: string;
}

export interface ConvertBulkZipMessage {
  type: 'CONVERT_BULK_ZIP';
  zipBase64: string;
  filename: string;
}

export interface ConvertResultMessage {
  type: 'CONVERT_RESULT';
  pngBase64: string;
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

export interface GetStateMessage {
  type: 'GET_STATE';
}

export interface StateResponseMessage {
  type: 'STATE_RESPONSE';
  enabled: boolean;
  convertedCount: number;
  status: string;
}

export type ExtensionMessage =
  | ConvertHeicMessage
  | ConvertBulkZipMessage
  | ConvertResultMessage
  | ConvertErrorMessage
  | ZipResultMessage
  | ToggleEnabledMessage
  | GetStateMessage
  | StateResponseMessage;
