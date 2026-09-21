import { useState } from 'react';
import { AdminDataTable } from '@ui/admin/AdminDataTable.jsx';
import { useAdminSocialPosts } from '../../queries/social/useSocialQueries.js';
import { PAGE_SIZE, createEmptyTableData } from '../../shared/constants.js';
import { ErrorCard } from '../../shared/ErrorCard.jsx';
import { formatDateTime } from '../../shared/formatters.js';

export default function SocialPostsPage({ onSelectSocialPost }) {
  const [page, setPage] = useState(1);
  const postsQuery = useAdminSocialPosts({ page, pageSize: PAGE_SIZE }, { keepPrevious: true });

  return (
    <div className="admin-content-grid">
      {postsQuery.isError ? (
        <ErrorCard error={postsQuery.error} onRetry={() => postsQuery.refetch()} />
      ) : (
        <AdminDataTable
          title="Social posts"
          description="LinkedIn posts synced from Buffer for the homepage feed."
          columns={getSocialPostColumns()}
          rows={postsQuery.data?.records || []}
          pagination={{
            ...(postsQuery.data?.pagination ?? createEmptyTableData().pagination),
            onPageChange: setPage,
          }}
          emptyMessage="No social posts found. Sync from Buffer to populate the homepage feed."
          onRowClick={onSelectSocialPost}
          tone="light"
        />
      )}
    </div>
  );
}

function getSocialPostColumns() {
  return [
    {
      key: 'coverImageUrl',
      label: 'Cover',
      render: record =>
        record.coverImageUrl ? (
          <img className="admin-social-thumb" src={record.coverImageUrl} alt="" />
        ) : (
          <span className="admin-social-thumb admin-social-thumb--empty">Logo</span>
        ),
    },
    {
      key: 'excerpt',
      label: 'Excerpt',
    },
    {
      key: 'publishedAt',
      label: 'Published',
      render: record => formatDateTime(record.publishedAt),
    },
    {
      key: 'likeCount',
      label: 'Likes',
      render: record => record.likeCount || 0,
    },
  ];
}
