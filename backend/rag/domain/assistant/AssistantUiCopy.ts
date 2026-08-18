export interface AssistantActionCopy {
  label: string;
}

export interface AssistantUiCopy {
  statusText: string;
  quickPrompts: string[];
  leadCaptureQuickPrompts: string[];
  leadCaptureSkipWords: string[];
  messages: Record<string, string>;
  actions: Record<string, AssistantActionCopy>;
  labels: Record<string, string>;
  leadConfirm: Record<string, string>;
  placeholders: Record<string, string>;
}

export interface AssistantSourceCopy extends AssistantUiCopy {
  copyVersion: string;
}

export interface AssistantUiCopyResponse {
  language: string;
  direction: 'ltr' | 'rtl';
  copyVersion: string;
  copy: AssistantUiCopy;
}
