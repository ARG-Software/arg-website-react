import { useState } from 'react';

import { BaseCard } from '../cards/BaseCard.jsx';
import { ChoiceFilter } from './ChoiceFilter.jsx';

export default {
  title: 'Filters/ChoiceFilter',
  component: ChoiceFilter,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function Interactive() {
  const options = ['All', 'Cost & timeline', 'Working together', 'Technical'];
  const [value, setValue] = useState(options[0]);

  return (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-frame--md storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Filter controls</p>
          <h1 className="storybook-title storybook-title--sm">
            Pills on desktop, a select on phones.
          </h1>
        </div>
        <BaseCard padding="lg" hover="none">
          <ChoiceFilter options={options} value={value} onChange={setValue} />
        </BaseCard>
      </section>
    </main>
  );
}
