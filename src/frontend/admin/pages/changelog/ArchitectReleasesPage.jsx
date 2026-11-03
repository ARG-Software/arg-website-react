import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { useAdminArchitectReleases } from '../../queries/changelog/useArchitectReleaseQueries.js';
import { PAGE_SIZE, createEmptyTableData } from '../../shared/constants.js';
import { ErrorCard } from '../../shared/ErrorCard.jsx';
import { formatDateTime } from '../../shared/formatters.js';

export default function ArchitectReleasesPage() {
  const [page, setPage] = useState(1);
  const releasesQuery = useAdminArchitectReleases({ page, pageSize: PAGE_SIZE }, { keepPrevious: true });

  return (
    <div className="admin-content-grid">
      {releasesQuery.isError ? (
        <ErrorCard error={releasesQuery.error} onRetry={() => releasesQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Architect changelog"
          description="GitHub Releases mirrored from the private Architect repo for the public changelog."
          columns={getArchitectReleaseColumns()}
          rows={releasesQuery.data?.records || []}
          pagination={{
            ...(releasesQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage="No releases found. Fetch releases to populate the public changelog."
          tone="light"
        />
      )}
    </div>
  );
}

function getArchitectReleaseColumns() {
  return [
    {
      key: 'tagName',
      label: 'Version',
    },
    {
      key: 'name',
      label: 'Title',
      truncate: true,
      maxWidth: '18rem',
    },
    {
      key: 'excerpt',
      label: 'Excerpt',
      truncate: true,
      maxWidth: '32rem',
    },
    {
      key: 'publishedAt',
      label: 'Published',
      render: record => formatDateTime(record.publishedAt),
    },
  ];
}
