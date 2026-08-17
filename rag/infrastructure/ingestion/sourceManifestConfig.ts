import { readFileSync } from 'node:fs';

import { ASSISTANT_POLICY_CONTENT } from '../../domain/assistant/AssistantPolicy.js';
import type {
  ExternalSourceManifestEntry,
  InlineJsonManifestEntry,
  LocalManifestEntry,
} from './SourceManifestTypes.js';

interface AssistantPolicySourceConfig {
  kind: 'assistant_policy';
  sourceType: InlineJsonManifestEntry['sourceType'];
  sourceKey: string;
  title: string;
  url?: string;
  label?: string;
  virtualPath: string;
}

interface SourceManifestConfig {
  firstPartySources: Array<LocalManifestEntry | AssistantPolicySourceConfig>;
  trustedExternalSources: ExternalSourceManifestEntry[];
}

const sourceManifestConfig = readSourceManifestConfig();

export function getFirstPartySourceEntries(): LocalManifestEntry[] {
  return sourceManifestConfig.firstPartySources.map(entry =>
    entry.kind === 'assistant_policy' ? createAssistantPolicySource(entry) : entry
  );
}

export function getTrustedExternalSourceEntries(): ExternalSourceManifestEntry[] {
  return sourceManifestConfig.trustedExternalSources;
}

function createAssistantPolicySource(entry: AssistantPolicySourceConfig): InlineJsonManifestEntry {
  return {
    kind: 'inline_json',
    sourceType: entry.sourceType,
    sourceKey: entry.sourceKey,
    title: entry.title,
    ...(entry.url ? { url: entry.url } : {}),
    ...(entry.label ? { label: entry.label } : {}),
    virtualPath: entry.virtualPath,
    content: ASSISTANT_POLICY_CONTENT,
  };
}

function readSourceManifestConfig(): SourceManifestConfig {
  return JSON.parse(
    readFileSync(new URL('../../config/sources.json', import.meta.url), 'utf8')
  ) as SourceManifestConfig;
}
