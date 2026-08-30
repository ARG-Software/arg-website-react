import type { CommercialDeliveryKind } from '../routing/retrievalroute.types.js';
import { normalizeName } from '../shared/text.js';

export function hasNamedCommercialFact(
  content: string,
  projectName: string,
  commercialKind: CommercialDeliveryKind | undefined
): boolean {
  const projectLine = content
    .split('\n')
    .find(line => normalizeName(line).startsWith(`${normalizeName(projectName)} `));

  if (!projectLine) {
    return false;
  }

  if (commercialKind === 'project_budget') {
    return /\bbudget\s+\$[\d.]+[KMB]?\s*-\s*\$[\d.]+[KMB]?/i.test(projectLine);
  }

  if (commercialKind === 'project_duration') {
    return /\bduration\s+\d+\s+months?\b/i.test(projectLine);
  }

  return true;
}
