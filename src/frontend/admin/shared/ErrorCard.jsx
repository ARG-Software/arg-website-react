import { UiCard } from '@ui/primitives/UiCard.jsx';

export function ErrorCard({ error, onRetry }) {
  return (
    <UiCard className="admin-error-card" tone="light">
      <p className="admin-error">Couldn't load data.</p>
      {error?.message && <p className="admin-error-detail">{error.message}</p>}
      <button type="button" className="admin-retry" onClick={onRetry}>
        Retry
      </button>
    </UiCard>
  );
}
