import { UiStatusPill } from '@ui/primitives/UiStatusPill.jsx';
import { getContactMethodLabel, getStatusLabel } from '../../outreach.js';

export function getOutreachRecordColumns({ sortableCompany = false } = {}) {
  return [
    {
      key: 'companyName',
      label: 'Company',
      sortable: sortableCompany,
      render: record => <CompanyLink record={record} />,
    },
    {
      key: 'website',
      label: 'Site URL',
      render: record => <WebsiteLink website={record.website} />,
    },
    {
      key: 'contactEmail',
      label: 'Contact',
      render: record => record.contactEmail || record.contactInfo || record.website || 'No contact',
    },
    {
      key: 'contactMethod',
      label: 'Method',
      render: record => getContactMethodLabel(record.contactMethod),
    },
    {
      key: 'status',
      label: 'Status',
      render: record => (
        <UiStatusPill status={record.status}>{getStatusLabel(record.status)}</UiStatusPill>
      ),
    },
    {
      key: 'dateSent',
      label: 'Date sent',
      sortable: true,
      render: record => record.dateSent || '-',
    },
    {
      key: 'followUpDate',
      label: 'Follow up',
      sortable: true,
      render: record => record.followUpDate || '-',
    },
  ];
}

function CompanyLink({ record }) {
  if (!record.website) return record.companyName || '-';

  return (
    <WebsiteAnchor website={record.website}>{record.companyName || record.website}</WebsiteAnchor>
  );
}

function WebsiteLink({ website }) {
  if (!website) return '-';

  return <WebsiteAnchor website={website}>{website}</WebsiteAnchor>;
}

function WebsiteAnchor({ website, children }) {
  return (
    <a
      className="admin-table-link"
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      onClick={event => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
