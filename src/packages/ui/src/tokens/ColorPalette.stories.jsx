const TOKENS = [
  ['--arg-color-ink', '#0c002e'],
  ['--arg-color-white', '#ffffff'],
  ['--arg-color-red', '#f0060d'],
  ['--arg-color-magenta', '#c924d7'],
  ['--arg-color-violet', '#7904fd'],
  ['--arg-color-surface', '#f3f3f7'],
];

const meta = {
  title: 'Design Tokens/Color Palette',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'White' },
  },
};

export default meta;

export function Palette() {
  return (
    <main className="storybook-showcase storybook-showcase--light">
      <section className="storybook-frame storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">ARG UI palette</p>
          <h1 className="storybook-title storybook-title--sm">
            Shared color tokens for reusable products.
          </h1>
        </div>
        <div className="storybook-grid">
          {TOKENS.map(([name, value]) => (
            <article key={name} className="storybook-color-card storybook-panel">
              <div
                className="storybook-color-card__swatch"
                style={{ background: `var(${name})` }}
              />
              <div className="storybook-color-card__body">
                <code>{name}</code>
                <span>{value}</span>
              </div>
            </article>
          ))}
        </div>
        <article className="storybook-panel" style={{ background: 'var(--arg-gradient-primary)' }}>
          <p className="storybook-eyebrow">--arg-gradient-primary</p>
          <h2 className="storybook-card-title">Red to magenta to violet</h2>
        </article>
      </section>
    </main>
  );
}
