import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { AssistantSourceCopy } from '../../domain/assistant/AssistantUiCopy.js';
import {
  readActionCopy,
  readString,
  readStringArray,
  readStringRecord,
} from '../../application/assistantUiCopy/normalization.js';

const ASSISTANT_COPY_PATH = resolve(process.cwd(), 'src/data/assistant.json');

export function readAssistantSourceCopy(): AssistantSourceCopy {
  const source = JSON.parse(readFileSync(ASSISTANT_COPY_PATH, 'utf8')) as Record<string, unknown>;

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
