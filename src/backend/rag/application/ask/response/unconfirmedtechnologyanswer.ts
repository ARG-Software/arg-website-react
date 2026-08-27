import type { IRetrievalItemResult } from '../planning/createretrievalitems.js';
import { extractTechnologyName } from '../retrieval/technology/normalizetechnology.js';
import {
  isEngineeringPracticeQuestion,
  isNamedEntityTechnologyQuestion,
  isTechnologySupportQuestion,
} from '../retrieval/technology/splittechnologyquestion.js';

export function createUnconfirmedTechnologyAnswer(
  results: IRetrievalItemResult[],
  responseLanguage: string
): string | null {
  if (results.length !== 1 || !isEnglishResponseLanguage(responseLanguage)) {
    return null;
  }

  const businessSystemAnswer = createBusinessSystemAnswer(results[0]);
  if (businessSystemAnswer) {
    return businessSystemAnswer;
  }

  const locationAnswer = createLocationAnswer(results[0]);
  if (locationAnswer) {
    return locationAnswer;
  }

  const industryDomainAnswer = createIndustryDomainAnswer(results[0]);
  if (industryDomainAnswer) {
    return industryDomainAnswer;
  }

  if (isNamedEntityTechnologyQuestion(results[0].plan.entity)) {
    return null;
  }

  if (isEngineeringPracticeQuestion(results[0].retrievalQuestion, results[0].plan.subject)) {
    return null;
  }

  if (!isTechnologySupportQuestion(results[0].retrievalQuestion)) {
    return null;
  }

  const technology =
    extractTechnologyName(results[0].plan.subject) ??
    extractTechnologyName(results[0].retrievalQuestion);

  if (!technology) {
    return null;
  }

  return [
    `${technology} is not part of our usual or preferred stack.`,
    'Our preferred production stack is TypeScript, JavaScript, and C#, and we also use Python when it fits the problem.',
    `That said, the language or tool is just the vehicle for the outcome, not a bottleneck. If ${technology} is the right fit for your project, we can assess and adapt.`,
  ].join(' ');
}

function createLocationAnswer(result: IRetrievalItemResult): string | null {
  const text = `${result.retrievalQuestion} ${result.plan.subject}`;

  if (!isLocationQuestion(text)) {
    return null;
  }

  return 'We are remote-first, with headquarters in Garajau, Caniço, Madeira, and Aldoar, Porto. For in-person meetings, exact addresses, or walk-ins, please book a meeting or email hello@arg.software so we can coordinate the right location.';
}

function createIndustryDomainAnswer(result: IRetrievalItemResult): string | null {
  const text = `${result.retrievalQuestion} ${result.plan.subject}`;

  if (!isIndustryDomainQuestion(text)) {
    return null;
  }

  return [
    'We cannot confirm specific published experience in that industry from the available public material.',
    'That does not mean we would reject it: we have worked successfully across different industries and domains, and we adapt when the problem, constraints, and delivery setup make sense.',
    'Our motivation is to offer the right software solution rather than be blocked by industry-specific context, so the best next step is to share the requirements and let us assess the fit properly.',
  ].join(' ');
}

function createBusinessSystemAnswer(result: IRetrievalItemResult): string | null {
  const text = `${result.retrievalQuestion} ${result.plan.subject}`;

  if (isStrapiCrmQuestion(text)) {
    return 'Strapi is not a CRM. It is a headless CMS: it manages structured content and exposes it through APIs. It can support CRM-like custom admin screens if the product is designed that way, but it is not an out-of-the-box CRM like HubSpot, Salesforce, Pipedrive, or Zoho.';
  }

  if (isCrmQuestion(text)) {
    return 'CRM work depends on whether you mean integrating an existing CRM or building a custom CRM. We can assess both as business-system work: APIs, data model, authentication, sync rules, automations, reporting, permissions, and how the CRM connects to your product or operations. Examples include HubSpot, Salesforce, Pipedrive, Zoho, or a custom customer workflow system.';
  }

  if (isCmsQuestion(text)) {
    return 'CMS work depends on whether you need an existing CMS integration, a headless CMS, or a custom admin/back-office tool. We can assess options such as Strapi, Contentful, Sanity, WordPress, or a custom setup based on content workflow, approvals, frontend delivery, permissions, and integrations.';
  }

  if (isErpQuestion(text)) {
    return 'ERP work depends on whether you need to integrate an existing ERP or build custom internal operations software. We can assess systems such as Odoo, SAP, Oracle NetSuite, Microsoft Dynamics, or a custom workflow around data model, permissions, reporting, automation, and integrations.';
  }

  return null;
}

function isCrmQuestion(value: string): boolean {
  return /\b(?:crm|customer\s+relationship\s+management|hubspot|salesforce|pipedrive|zoho)\b/iu.test(
    value
  );
}

function isCmsQuestion(value: string): boolean {
  return /\b(?:cms|content\s+management\s+system|strapi|contentful|sanity|wordpress)\b/iu.test(
    value
  );
}

function isErpQuestion(value: string): boolean {
  return /\b(?:erp|enterprise\s+resource\s+planning|odoo|sap|netsuite|oracle\s+netsuite|microsoft\s+dynamics|dynamics\s+365)\b/iu.test(
    value
  );
}

function isLocationQuestion(value: string): boolean {
  return /\b(?:address|addresses|aldoar|based|cani[cç]o|exact\s+address|garajau|headquarters|location|locations|madeira|office|offices|physical\s+(?:site|spot|office)|porto|street\s+address|where\s+are\s+you)\b/iu.test(
    value
  );
}

function isIndustryDomainQuestion(value: string): boolean {
  return /\b(?:agritech|automotive|aviation|banking|domain|domains|education|energy|field|fields|fintech|healthcare|industry|industries|insurance|logistics|manufacturing|maritime|media|medtech|music|public\s+sector|retail|sector|sectors|shipping|space|telecom|travel|vertical|verticals)\b/iu.test(
    value
  );
}

function isStrapiCrmQuestion(value: string): boolean {
  return /\bstrapi\b/iu.test(value) && isCrmQuestion(value);
}

function isEnglishResponseLanguage(responseLanguage: string): boolean {
  if (!responseLanguage) {
    return true;
  }

  const normalizedLanguage = responseLanguage.toLowerCase();
  return normalizedLanguage.includes('english') || normalizedLanguage.startsWith('en');
}
