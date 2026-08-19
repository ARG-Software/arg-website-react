import { UiButton } from '../primitives/UiButton.jsx';
import { UiField, UiTextarea } from '../primitives/UiField.jsx';
import { AdminRecordOverlay } from './AdminRecordOverlay.jsx';

export default {
  title: 'Admin/AdminRecordOverlay',
  component: AdminRecordOverlay,
};

export const Default = {
  args: {
    isOpen: true,
    title: 'Fintech Labs',
    eyebrow: 'Round 1 · row 12',
    actions: <UiButton>Send email</UiButton>,
    children: (
      <div className="admin-detail-form">
        <UiField id="storybook-company" label="Company" defaultValue="Fintech Labs" />
        <UiField
          id="storybook-contact"
          label="Contact email"
          defaultValue="hello@fintech.example"
        />
        <UiTextarea id="storybook-notes" label="Notes" defaultValue="Strong ICP fit." />
      </div>
    ),
    onClose: () => {},
  },
};
