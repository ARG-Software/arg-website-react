const STATUS_LABELS = {
  draft: 'Draft',
  ready: 'Ready',
  sent: 'Sent',
  replied: 'Replied',
  follow_up_needed: 'Follow-up',
  closed: 'Closed',
  not_relevant: 'Not relevant',
};

export function UiStatusPill({ status, children }) {
  const normalizedStatus = status || 'draft';

  return (
    <span className={`ui-status-pill ui-status-pill--${normalizedStatus}`}>
      {children || STATUS_LABELS[normalizedStatus] || normalizedStatus}
    </span>
  );
}
