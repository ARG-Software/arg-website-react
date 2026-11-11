import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import type { IAuditPageJson, IFaqJson, ISiteLinksJson } from '../sitedata.types.js';
import { readJsonFile, resolveRoot } from './loaderfiles.js';

const FAQ_FILE_PATH = 'src/frontend/data/faq.json';
const SITE_LINKS_FILE_PATH = 'src/frontend/data/siteLinks.json';
const AUDIT_URL = '/audit/';
const ARCHITECTURE_REVIEW_URL = '/audit/architecture-review/';

export async function loadAuditSources(
  rootDir: string,
  relativeFilePath: string
): Promise<IRagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const faqFilePath = resolveRoot(rootDir, FAQ_FILE_PATH);
  const siteLinksFilePath = resolveRoot(rootDir, SITE_LINKS_FILE_PATH);
  const page = await readJsonFile<IAuditPageJson>(filePath);
  const faq = await readJsonFile<IFaqJson>(faqFilePath);
  const siteLinks = await readJsonFile<ISiteLinksJson>(siteLinksFilePath);
  const { architect, bridge, review, start, read, nextSteps, send, reviewPage } = page;
  const reportReview = nextSteps.tiers.find(tier => tier.id === 'report-review');
  const [extensionLayer, reviewLayer] = bridge.layers;
  const browsers = ['Chrome', 'Firefox', ...architect.browsers.map(browser => browser.name)].join(
    ', '
  );
  const reviewPrice = `${review.price.from} ${review.price.amount} (${review.price.meta})`;
  const reviewSizes = review.sizes.items
    .map(item => `${item.name} (${item.title}): ${item.text} ${item.price}.`)
    .join(' ');
  const pricingTexts = (faq.items.find(item => item.id === 'pricing')?.answer ?? [])
    .map(block => block.text)
    .filter(Boolean);
  const projectPricing = [
    pricingTexts[0] ?? '',
    pricingTexts.length > 1 ? pricingTexts[pricingTexts.length - 1] : '',
  ]
    .filter(Boolean)
    .join(' ');

  const architectContent = [
    [
      `ARG Architect is ARG Software's ${extensionLayer.tag.toLowerCase()} browser extension that audits websites. ${architect.title} ${architect.text}`,
      `Price: ${architect.privacy}.`,
      `Supported browsers: ${browsers}. Brave, Edge and Opera install it from the Chrome Web Store.`,
      `Install ARG Architect for Chrome: ${siteLinks.stores?.chrome}`,
      `Install ARG Architect for Firefox: ${siteLinks.stores?.firefox}`,
      `ARG Architect is a product, not the Senior Team Extension service and not the arg-browser-extension or arg-web-audit agent skills.`,
    ].join('\n'),
    ...architect.features.map(
      feature =>
        `ARG Architect ${feature.title} category: ${feature.text}\nARG Architect ${feature.title} checks: ${feature.metrics.join(', ')}.`
    ),
    [
      `${architect.checks.title} (ARG Architect):`,
      ...architect.checks.items.map(item => `${item.title}: ${item.text}`),
    ].join('\n'),
    [
      `ARG Architect privacy, ${architect.private.title.toLowerCase()}:`,
      ...architect.private.items.map(item => `${item.label}: ${item.text}`),
    ].join('\n'),
    [
      `ARG Architect awards and launch badges: the badges in the Studio Pulse section of the homepage are awards and launch recognition that ARG Architect earned on product launch platforms. ARG Software shows them as team merits, because they are public recognition from independent maker and developer communities for a free tool the team built in-house.`,
      ...(siteLinks.awards ?? []).map(
        award => `${award.name} (${award.label}): ${award.about} Link: ${award.href}`
      ),
    ].join('\n'),
    [
      `What ARG Architect can and cannot see: ${bridge.text}`,
      `${extensionLayer.name} (${extensionLayer.tag}) covers ${extensionLayer.who.toLowerCase()}: ${extensionLayer.items.join('; ')}.`,
      `${reviewLayer.name} (${reviewLayer.tag}) covers ${reviewLayer.who.toLowerCase()}: ${reviewLayer.items.join('; ')}.`,
    ].join('\n'),
    [
      `${read.title} The overall score falls in one of four bands: ${read.bands
        .map(band => `${band.label} (${band.range})`)
        .join(', ')}.`,
      `Category weights: ${read.weights.map(item => `${item.name} ${item.weight}%`).join(', ')}. ${read.weightsNote}`,
      `When a row has no verdict, it says why: ${read.states.map(state => `${state.label}: ${state.text}`).join(' ')}`,
      ...read.notes.map(note => `${note.title}: ${note.text}`),
    ].join('\n'),
  ].join('\n\n');

  const reportReviewContent = [
    [
      `The ${reportReview?.name} is ARG Software's fixed-price review of an ARG Architect report, separate from the free extension and from the Architecture Review. ${reportReview?.title}`,
      `Price: ${reportReview?.price} (${reportReview?.priceMeta}).`,
      `What you get: ${reportReview?.items.join('; ')}.`,
      `Limit: ${reportReview?.limit}`,
      `${nextSteps.title} ${nextSteps.titleHighlight} When the cause is in the code, the data or the infrastructure, the next step is the Architecture Review, from ${review.price.amount} for one week. ${reviewPage.credit}`,
    ].join('\n'),
    [
      `How to send an ARG Architect report to ARG Software. ${send.title} ${send.titleHighlight}`,
      ...send.steps.map((step, index) => `Step ${index + 1}, ${step.title}: ${step.text}`),
      `${send.emailText} ${siteLinks.emails?.dev}.`,
      `${send.sentTitle}: ${send.sent.join('; ')}.`,
      `${send.neverTitle}: ${send.never.join('; ')}.`,
      send.note,
    ].join('\n'),
  ].join('\n\n');

  const reviewContent = [
    [
      `The Architecture Review is ARG Software's paid review service, separate from the free ARG Architect browser extension. ${review.title}`,
      review.text,
      `Price: ${reviewPrice}. ${review.price.scopeNote} ${reviewPage.credit}`,
      `${review.price.cta}: ${siteLinks.calendar?.architecture}`,
    ].join('\n'),
    ...review.lists.map(
      list => `Architecture review, ${list.title.toLowerCase()}: ${list.items.join('; ')}.`
    ),
    `Architecture review, ${review.notIncludedLabel.toLowerCase()} ${review.notIncluded}`,
    `Architecture review, ${review.price.scopeTitle.toLowerCase()}: ${review.price.scope
      .map(item => `${item.label}: ${item.value}`)
      .join('; ')}. ${review.price.scopeNote}`,
    `Architecture review for a bigger system. ${review.sizes.text} ${reviewSizes}`,
    [
      `How to start an architecture review: ${start.title}`,
      ...start.steps.map((step, index) => `Step ${index + 1}, ${step.title}: ${step.text}`),
      `${review.price.cta}: ${siteLinks.calendar?.architecture}`,
      start.proof,
    ].join('\n'),
  ].join('\n\n');

  const pricingContent = [
    'ARG Software pricing overview. Each price belongs to one offering. "From" and "start around" figures are starting points, not totals or caps. Unnamed working-with-ARG or project-cost questions lead with custom software, then a short named list of the other offerings.',
    `Custom software and product delivery: ${projectPricing}`,
    'Other offerings, only if that is what the visitor meant:',
    `ARG Architect browser extension: ${architect.privacy}.`,
    `Report review of an ARG Architect report: ${reportReview?.price} (${reportReview?.priceMeta}).`,
    `Architecture review: ${reviewPrice}. One week covers one agreed part of a system, not the whole application. ${review.price.scopeNote}`,
  ].join('\n');

  const metadata = {
    source_file: filePath,
    source_files: [filePath, faqFilePath, siteLinksFilePath],
  };

  return [
    createSource({
      sourceType: 'working_with_us',
      sourceKey: 'arg-architect',
      title: 'ARG Architect (free browser extension)',
      url: `${AUDIT_URL}#architect`,
      path: filePath,
      metadata,
      content: architectContent,
    }),
    createSource({
      sourceType: 'working_with_us',
      sourceKey: 'report-review',
      title: 'Report Review (€500, ARG Architect report)',
      url: `${AUDIT_URL}#next-steps`,
      path: filePath,
      metadata,
      content: reportReviewContent,
    }),
    createSource({
      sourceType: 'working_with_us',
      sourceKey: 'architecture-review',
      title: 'Architecture Review (paid, one week)',
      url: ARCHITECTURE_REVIEW_URL,
      path: filePath,
      metadata,
      content: reviewContent,
    }),
    createSource({
      sourceType: 'working_with_us',
      sourceKey: 'pricing-overview',
      title: 'ARG Pricing Overview',
      url: AUDIT_URL,
      path: filePath,
      metadata,
      content: pricingContent,
    }),
  ];
}
