export function UiStat({ label, value, detail, tone = 'default' }) {
  const className = ['ui-stat', `ui-stat--${tone}`].filter(Boolean).join(' ');

  return (
    <article className={className}>
      <span className="ui-stat__label">{label}</span>
      <strong className="ui-stat__value">{value}</strong>
      {detail && <span className="ui-stat__detail">{detail}</span>}
    </article>
  );
}
