import assistantSourceCopy from '../../../../frontend/data/assistant.json' with { type: 'json' };
import type { AssistantSourceCopy } from '../../domain/assistant/AssistantUiCopy.js';
import {
  readActionCopy,
  readString,
  readStringArray,
  readStringRecord,
} from '../../application/assistantUiCopy/normalization.js';

export function readAssistantSourceCopy(): AssistantSourceCopy {
  const source = assistantSourceCopy as Record<string, unknown>;

  return {
    copyVersion: readString(source.copyVersion, '1'),
    statusText: readString(source.statusText, 'online now'),
    quickPrompts: readStringArray(source.quickPrompts),
    leadCaptureQuickPrompts: readStringArray(source.leadCaptureQuickPrompts),
    leadCaptureSkipWords: readStringArray(source.leadCaptureSkipWords),
    messages: readStringRecord(source.messages),
    actions: readActionCopy(source.actions),
    labels: readStringRecord(source.labels),
    leadConfirm: readStringRecord(source.leadConfirm),
    placeholders: readStringRecord(source.placeholders),
  };
}
