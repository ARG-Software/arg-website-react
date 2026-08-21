import { useState } from 'react';

import { UiButton } from '../primitives/UiButton.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';

export default {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'Dark' } },
};

export function MarkAsSent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="storybook-showcase storybook-showcase--dark storybook-showcase--center">
      <UiButton onClick={() => setIsOpen(true)}>Open confirmation</UiButton>
      <ConfirmDialog
        isOpen={isOpen}
        title="Mark this outreach email as sent?"
        cancelLabel="Don't mark as sent"
        confirmLabel="Mark as sent"
        onCancel={() => setIsOpen(false)}
        onConfirm={() => setIsOpen(false)}
      >
        <p>The sent date will be saved so the record stays locked for reporting.</p>
      </ConfirmDialog>
    </main>
  );
}
