import { AdminRecordOverlay } from '@ui/admin/AdminRecordOverlay.jsx';
import { formatDateTime } from '../../shared/formatters.js';

export function SocialPostOverlay({ post, onClose }) {
  if (!post) return null;

  return (
    <AdminRecordOverlay
      isOpen
      title={post.excerpt || 'Social post'}
      eyebrow={formatDateTime(post.publishedAt)}
      onClose={onClose}
      tone="light"
      actions={
        post.externalUrl ? (
          <a
            href={post.externalUrl}
            className="admin-retry"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on LinkedIn
          </a>
        ) : null
      }
    >
      <div className="admin-conversation-meta">
        <span>Published: {formatDateTime(post.publishedAt)}</span>
        <span>Likes: {post.likeCount || 0}</span>
      </div>
      {post.coverImageUrl ? (
        <img className="admin-social-detail-cover" src={post.coverImageUrl} alt="" />
      ) : null}
      <p className="admin-social-detail-text">{post.text || post.excerpt}</p>
    </AdminRecordOverlay>
  );
}
