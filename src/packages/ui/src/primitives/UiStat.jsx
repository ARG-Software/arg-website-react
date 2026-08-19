export function UiStat({ label, value, detail }) {
  return (
    <article className="ui-stat">
      <span className="ui-stat__label">{label}</span>
      <strong className="ui-stat__value">{value}</strong>
      {detail && <span className="ui-stat__detail">{detail}</span>}
    </article>
  );
}
