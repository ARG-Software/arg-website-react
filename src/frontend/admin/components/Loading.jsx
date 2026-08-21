export function Loading({ text = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="loading__spinner" />
      {text && <p className="loading__text">{text}</p>}
    </div>
  );
}
