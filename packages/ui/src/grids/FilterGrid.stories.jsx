import { useState } from 'react';

import { PillButton } from '../pills/Pill.jsx';
import { FilterGrid } from './FilterGrid.jsx';

const ITEMS = [
  { id: 'core', category: 'Platform', title: 'Core platform', detail: 'Shared foundation' },
  { id: 'insights', category: 'Analytics', title: 'Insights', detail: 'Usage trends' },
  { id: 'flows', category: 'Automation', title: 'Flows', detail: 'Workflow builder' },
  { id: 'exports', category: 'Analytics', title: 'Exports', detail: 'Scheduled reports' },
];

export default {
  title: 'Grids/FilterGrid',
  component: FilterGrid,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function Interactive() {
  const [activeCategory, setActiveCategory] = useState('Analytics');

  return (
    <main className="storybook-showcase storybook-showcase--light">
      <section className="storybook-frame storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Filter grid</p>
          <h1 className="storybook-title storybook-title--sm">Selectable product cards.</h1>
          <p className="storybook-copy">
            The grid keeps hidden items in place visually, making category changes feel deliberate.
          </p>
        </div>
        <div className="storybook-row">
          {['All', 'Platform', 'Analytics', 'Automation'].map(category => (
            <PillButton
              key={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </PillButton>
          ))}
        </div>
        <FilterGrid
          items={ITEMS}
          activeCategory={activeCategory}
          animate={false}
          getItemKey={item => item.id}
          isItemVisible={(item, category) => category === 'All' || item.category === category}
          onItemClick={item => setActiveCategory(item.category)}
          renderItem={item => (
            <div>
              <p className="storybook-eyebrow">{item.category}</p>
              <h3 className="storybook-card-title">{item.title}</h3>
              <p className="storybook-card-copy">{item.detail}</p>
            </div>
          )}
        />
      </section>
    </main>
  );
}
