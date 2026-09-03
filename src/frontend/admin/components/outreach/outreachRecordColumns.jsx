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
  const href = getWebsiteHref(record.website);
  if (!href) return record.companyName || '-';

  return (
    <WebsiteAnchor className="admin-table-link--company" href={href}>
      {record.companyName || record.website}
    </WebsiteAnchor>
  );
}

function WebsiteLink({ website }) {
  const href = getWebsiteHref(website);
  if (!href) return '-';

  return <WebsiteAnchor href={href}>{website}</WebsiteAnchor>;
}

function WebsiteAnchor({ href, className, children }) {
  return (
    <a
      className={['admin-table-link', className].filter(Boolean).join(' ')}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={event => event.stopPropagation()}
    >
      {children}
    </a>
  );
}

function getWebsiteHref(website) {
  if (!website) return null;

  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}
