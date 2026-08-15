import { UiCard } from './UiCard.jsx';
import { UiStat } from './UiStat.jsx';
import { UiStatusPill } from './UiStatusPill.jsx';

export default {
  title: 'UI/Card',
  component: UiCard,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'ARG dark' } },
};

export function ProductSummary() {
  return (
    <main className="storybook-showcase storybook-showcase--center">
      <section className="storybook-frame storybook-frame--sm storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Admin primitive</p>
          <h1 className="storybook-title storybook-title--sm">Dense product status card.</h1>
        </div>
        <UiCard className="storybook-panel">
          <UiStatusPill status="follow_up_needed">Needs review</UiStatusPill>
          <h3 className="storybook-card-title">Integration health</h3>
          <UiStat label="Synced" value="114" detail="32 events tracked" />
        </UiCard>
      </section>
    </main>
  );
}
