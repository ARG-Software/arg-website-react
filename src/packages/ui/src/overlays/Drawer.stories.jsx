import { useState } from 'react';

import { AnimatedArrowButton } from '../buttons/AnimatedArrowButton.jsx';
import { BaseCard } from '../cards/BaseCard.jsx';
import { Pill } from '../pills/Pill.jsx';
import { Drawer } from './Drawer.jsx';

export default {
  title: 'Overlays/Drawer',
  component: Drawer,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function BottomDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-frame--md storybook-section storybook-drawer-launch">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Drawer</p>
          <h1 className="storybook-title storybook-title--sm">Context without losing the page.</h1>
        </div>
        <AnimatedArrowButton onClick={() => setIsOpen(true)} hoverText="Open panel">
          Open drawer
        </AnimatedArrowButton>
      </section>
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <BaseCard padding="lg" hover="none">
          <Pill variant="dark">Drawer panel</Pill>
          <h2 className="storybook-card-title">Reusable detail view</h2>
          <p className="storybook-card-copy">
            Use this surface for contextual previews, setup steps, and secondary content.
          </p>
          <div className="storybook-row">
            {['Overview', 'Activity', 'Settings'].map(label => (
              <Pill key={label} variant="outline">
                {label}
              </Pill>
            ))}
          </div>
        </BaseCard>
      </Drawer>
    </main>
  );
}
