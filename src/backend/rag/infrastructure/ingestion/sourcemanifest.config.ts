import { ASSISTANT_POLICY_CONTENT } from '../../domain/assistant/assistantpolicy.js';
import sourceManifestConfigJson from '../../config/sources.json' with { type: 'json' };
import type {
  IExternalSourceManifestEntry,
  IInlineJsonManifestEntry,
  LocalManifestEntry,
} from './sourcemanifest.types.js';

interface IAssistantPolicySourceConfig {
  kind: 'assistant_policy';
  sourceType: IInlineJsonManifestEntry['sourceType'];
  sourceKey: string;
  title: string;
  url?: string;
  label?: string;
  virtualPath: string;
}

interface ISourceManifestConfig {
  firstPartySources: Array<LocalManifestEntry | IAssistantPolicySourceConfig>;
  trustedExternalSources: IExternalSourceManifestEntry[];
}

const sourceManifestConfig = sourceManifestConfigJson as ISourceManifestConfig;

export function getFirstPartySourceEntries(): LocalManifestEntry[] {
  return sourceManifestConfig.firstPartySources.map(entry =>
    entry.kind === 'assistant_policy' ? createAssistantPolicySource(entry) : entry
  );
}

export function getTrustedExternalSourceEntries(): IExternalSourceManifestEntry[] {
  return sourceManifestConfig.trustedExternalSources;
}

function createAssistantPolicySource(entry: IAssistantPolicySourceConfig): IInlineJsonManifestEntry {
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

