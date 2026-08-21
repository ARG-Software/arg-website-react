const STATUS_LABELS = {
  sent: 'Sent',
  not_sent: 'Not sent',
};

export function UiStatusPill({ status, children }) {
  const normalizedStatus = status || 'not_sent';

  return (
    <span className={`ui-status-pill ui-status-pill--${normalizedStatus}`}>
      {children || STATUS_LABELS[normalizedStatus] || normalizedStatus}
    </span>
  );
}
