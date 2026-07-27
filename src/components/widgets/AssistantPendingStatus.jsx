export function AssistantPendingStatus({ message }) {
  return (
    <div className="aw-pending" aria-live="polite">
      <div className="aw-typing">
        <span className="aw-typing__dot" />
        <span className="aw-typing__dot" />
        <span className="aw-typing__dot" />
      </div>
      {message && <div className="aw-pending__text">{message}</div>}
    </div>
  );
}
