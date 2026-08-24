export interface IAssistantActionCopy {
  label: string;
}

export interface IAssistantUiCopy {
  statusText: string;
  quickPrompts: string[];
  leadCaptureQuickPrompts: string[];
  leadCaptureSkipWords: string[];
  messages: Record<string, string>;
  actions: Record<string, IAssistantActionCopy>;
  labels: Record<string, string>;
  leadConfirm: Record<string, string>;
  placeholders: Record<string, string>;
}

export interface IAssistantSourceCopy extends IAssistantUiCopy {
  copyVersion: string;
}

export interface IAssistantUiCopyResponse {
  language: string;
  direction: 'ltr' | 'rtl';
  copyVersion: string;
  copy: IAssistantUiCopy;
}
