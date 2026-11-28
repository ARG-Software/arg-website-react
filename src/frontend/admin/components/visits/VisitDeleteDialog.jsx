import { ConfirmDialog } from '@ui/overlays/ConfirmDialog.jsx';

export function VisitDeleteDialog({ count, deleteMutation, onCancel, onConfirm }) {
  const many = count > 1;
  let confirmLabel = many ? `Delete ${count} visits` : 'Delete visit';
  if (deleteMutation.isPending) confirmLabel = 'Deleting...';

  return (
    <ConfirmDialog
      isOpen={count > 0}
      title={many ? `Delete ${count} visits?` : 'Delete this visit?'}
      cancelLabel={many ? 'Keep visits' : 'Keep visit'}
      confirmLabel={confirmLabel}
      confirmDisabled={deleteMutation.isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>
        This permanently removes {many ? 'these visit sessions' : 'the visit session'} and their
        journey events from analytics.
      </p>
      {deleteMutation.isError && <p className="admin-error">{deleteMutation.error.message}</p>}
    </ConfirmDialog>
  );
}
