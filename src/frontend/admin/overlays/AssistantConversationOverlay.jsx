import { AdminConversationTranscript } from '@ui/admin/AdminConversationTranscript.jsx';
import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { UiSpinner } from '@ui/primitives/UiSpinner.jsx';
import { useAssistantConversation } from '../queries/assistant/useAssistantQueries.js';
import { ErrorCard } from '../shared/ErrorCard.jsx';
import { formatDateTime } from '../shared/formatters.js';

export function AssistantConversationOverlay({ conversation, onClose }) {
  const detailQuery = useAssistantConversation(conversation?.id);

  if (!conversation) return null;

  const record = detailQuery.data || conversation;

  return (
    <AdminRecordOverlay
      isOpen
      title={record.preview || 'Assistant conversation'}
      eyebrow={formatDateTime(record.lastMessageAt || record.updatedAt)}
      onClose={onClose}
      tone="light"
    >
      <div className="admin-conversation-meta">
        <span>Page: {record.pagePath || '-'}</span>
        <span>Language: {record.language || '-'}</span>
        <span>Messages: {record.messageCount || 0}</span>
      </div>
      {detailQuery.isError && (
        <ErrorCard error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
      )}
      {!detailQuery.isError && detailQuery.isLoading && (
        <UiSpinner label="Loading conversation..." />
      )}
      {!detailQuery.isError && !detailQuery.isLoading && (
        <AdminConversationTranscript messages={record.messages || []} />
      )}
    </AdminRecordOverlay>
  );
}
