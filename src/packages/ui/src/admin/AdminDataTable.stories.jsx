import { UiStatusPill } from '../primitives/UiStatusPill.jsx';
import { AdminDataTable } from './AdminDataTable.jsx';

export default {
  title: 'Admin/AdminDataTable',
  component: AdminDataTable,
};

const rows = [
  {
    id: '1',
    company_name: 'Fintech Labs',
    contact_email: 'hello@fintech.example',
    status: 'sent',
    date_sent: '2026-08-13',
  },
  {
    id: '2',
    company_name: 'Media Engine',
    contact_email: 'team@media.example',
    status: 'replied',
    date_sent: '2026-08-12',
  },
];

const columns = [
  { key: 'company_name', label: 'Company' },
  { key: 'contact_email', label: 'Contact' },
  {
    key: 'status',
    label: 'Status',
    render: row => <UiStatusPill status={row.status}>{row.status}</UiStatusPill>,
  },
  { key: 'date_sent', label: 'Date sent' },
];

export const Default = {
  args: {
    title: 'Latest sent',
    description: 'Rows open the edit overlay in the app.',
    columns,
    rows,
    pagination: {
      page: 1,
      totalPages: 3,
      onPageChange: () => {},
    },
  },
};

export const Empty = {
  args: {
    title: 'Not sent',
    columns,
    rows: [],
  },
};
