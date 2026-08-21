import { useState } from 'react';

import { BaseCard } from '../cards/BaseCard.jsx';
import { UiSelect } from './UiField.jsx';

export default {
  title: 'Primitives/UiField',
  component: UiSelect,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function SelectDropdown() {
  const [collection, setCollection] = useState('building-gaspar');

  return (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-frame--sm storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Form controls</p>
          <h1 className="storybook-title storybook-title--sm">Dropdown for compact filtering.</h1>
        </div>
        <BaseCard padding="lg" hover="none">
          <UiSelect
            id="storybook-collection-select"
            label="Filter by collection"
            value={collection}
            onChange={event => setCollection(event.target.value)}
          >
            <option value="">All collections</option>
            <option value="building-gaspar">Building Gaspar</option>
            <option value="architecture-notes">Architecture Notes</option>
          </UiSelect>
        </BaseCard>
      </section>
    </main>
  );
}
