import { AtomIcon } from './AtomIcon.jsx';
import { BlueskyIcon } from './BlueskyIcon.jsx';
import { CopyIcon } from './CopyIcon.jsx';
import { LinkedInIcon } from './LinkedInIcon.jsx';
import { RssIcon } from './RssIcon.jsx';
import { XIcon } from './XIcon.jsx';

const ICONS = [
  ['AtomIcon', AtomIcon],
  ['BlueskyIcon', BlueskyIcon],
  ['CopyIcon', CopyIcon],
  ['LinkedInIcon', LinkedInIcon],
  ['RssIcon', RssIcon],
  ['XIcon', XIcon],
];

export default {
  title: 'Icons/Social And Utility',
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function Gallery() {
  return (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-frame--sm storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Icon set</p>
          <h1 className="storybook-title storybook-title--sm">Social and utility glyphs.</h1>
        </div>
        <div className="storybook-grid storybook-grid--compact">
          {ICONS.map(([name, Icon]) => (
            <article key={name} className="storybook-panel storybook-icon-card">
              <Icon />
              <span className="storybook-icon-label">{name}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
