import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { AdminVisitJourney } from '@ui/admin/AdminVisitJourney.jsx';
import { UiSpinner } from '@ui/primitives/UiSpinner.jsx';
import { useVisitJourney } from '../queries/visits/useVisitQueries.js';
import { ErrorCard } from '../shared/ErrorCard.jsx';
import { formatCountry, formatDateTime, formatDuration } from '../shared/formatters.js';

export function VisitJourneyOverlay({ session, onClose }) {
  const journeyQuery = useVisitJourney(session?.sessionHash);

  if (!session) return null;

  return (
    <AdminRecordOverlay
      isOpen
      title={session.entryPath || 'Visit journey'}
      eyebrow={formatDateTime(session.startedAt)}
      onClose={onClose}
      tone="light"
    >
      <div className="admin-conversation-meta">
        <span>Location: {formatLocation(session)}</span>
        <span>Pages: {session.pageCount || 0}</span>
        <span>Duration: {formatDuration(session.durationMs)}</span>
        <span>Last seen: {formatDateTime(session.lastSeenAt)}</span>
        <span>Referrer: {session.referrer || '(direct)'}</span>
      </div>
      {journeyQuery.isError && (
        <ErrorCard error={journeyQuery.error} onRetry={() => journeyQuery.refetch()} />
      )}
      {!journeyQuery.isError && journeyQuery.isLoading && <UiSpinner label="Loading journey..." />}
      {!journeyQuery.isError && !journeyQuery.isLoading && (
        <AdminVisitJourney events={journeyQuery.data?.events || []} />
      )}
    </AdminRecordOverlay>
  );
}

function formatLocation(session) {
  return (
    [session.city, session.region, formatCountry(session.countryCode)]
      .filter(Boolean)
      .filter(value => value !== 'Unknown')
      .join(', ') || 'Unknown'
  );
}
