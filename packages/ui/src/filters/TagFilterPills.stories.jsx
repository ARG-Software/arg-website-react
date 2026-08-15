import { useState } from 'react';

import { BaseCard } from '../cards/BaseCard.jsx';
import { TagFilterPills } from './TagFilterPills.jsx';

export default {
  title: 'Filters/TagFilterPills',
  component: TagFilterPills,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function Interactive() {
  const [selectedTags, setSelectedTags] = useState([]);
  const tags = ['Ready', 'Sent', 'Replied', 'Follow-up'];

  return (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-frame--md storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Filter controls</p>
          <h1 className="storybook-title storybook-title--sm">Pill filters for product lists.</h1>
        </div>
        <BaseCard padding="lg" hover="none">
          <TagFilterPills
            tags={tags}
            tagCounts={{ Ready: 12, Sent: 32, Replied: 4, 'Follow-up': 6 }}
            totalCount={54}
            selectedTags={selectedTags}
            onClear={() => setSelectedTags([])}
            onToggle={tag =>
              setSelectedTags(current =>
                current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]
              )
            }
          />
        </BaseCard>
      </section>
    </main>
  );
}
