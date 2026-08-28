import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';
import {
  useAssistantConversations,
  useDeleteAssistantConversation,
} from '../queries/assistant/useAssistantQueries.js';
import { PAGE_SIZE, createEmptyTableData } from '../shared/constants.js';
import { ErrorCard } from '../shared/ErrorCard.jsx';
import { formatDateTime } from '../shared/formatters.js';

export default function AssistantConversationsPage({ onSelectConversation }) {
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const conversationsQuery = useAssistantConversations(
    { page, pageSize: PAGE_SIZE },
    { keepPrevious: true }
  );
  const deleteMutation = useDeleteAssistantConversation();

  async function deleteConversation() {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    onSelectConversation(null);
  }

  return (
    <div className="admin-content-grid">
      {conversationsQuery.isError ? (
        <ErrorCard error={conversationsQuery.error} onRetry={() => conversationsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="AI Bot conversations"
          description="Encrypted Gaspar conversations saved after visitors pause or leave the chat."
          columns={getConversationColumns()}
          rows={conversationsQuery.data?.records || []}
          pagination={{
            ...(conversationsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage="No assistant conversations found."
          onRowClick={onSelectConversation}
          rowActions={record => (
            <button
              type="button"
              className="admin-table-action admin-table-action--danger"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTarget(record)}
            >
              Delete
            </button>
          )}
          tone="light"
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this conversation?"
        cancelLabel="Keep conversation"
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete conversation'}
        confirmDisabled={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteConversation}
      >
        <p>This permanently removes the encrypted transcript from the admin database.</p>
        {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
      </ConfirmDialog>
    </div>
  );
}

function getConversationColumns() {
  return [
    {
      key: 'lastMessageAt',
      label: 'Last activity',
      render: record => formatDateTime(record.lastMessageAt || record.updatedAt),
    },
    {
      key: 'preview',
      label: 'Conversation',
      render: record => record.preview || `Conversation on ${record.pagePath || 'unknown page'}`,
    },
    {
      key: 'pagePath',
      label: 'Page',
      render: record => record.pagePath || '-',
    },
    {
      key: 'messageCount',
      label: 'Messages',
      render: record => record.messageCount || 0,
    },
    {
      key: 'language',
      label: 'Language',
      render: record => record.language || '-',
    },
  ];
}
