import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';

export function VisitDeleteDialog({ deleteTarget, deleteMutation, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      isOpen={Boolean(deleteTarget)}
      title="Delete this visit?"
      cancelLabel="Keep visit"
      confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete visit'}
      confirmDisabled={deleteMutation.isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>This permanently removes the visit session and its journey events from analytics.</p>
      {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
    </ConfirmDialog>
  );
}
