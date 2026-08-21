export function OutreachTable({ records = [], pagination, onPageChange, onStatusChange }) {
  if (!records.length) {
    return <div className="outreach-table__empty">No records found</div>;
  }

  return (
    <div className="outreach-table">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Last Contact</th>
            <th>Next Follow-up</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr key={record.id}>
              <td>{record.companyName || '-'}</td>
              <td>{record.contactEmail || record.contactPhone || '-'}</td>
              <td>
                <select
                  value={record.status || 'pending'}
                  onChange={e => onStatusChange?.(record.id, e.target.value)}
                  className={`status-select status-select--${record.status || 'pending'}`}
                >
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
              <td>
                {record.lastContactAt ? new Date(record.lastContactAt).toLocaleDateString() : '-'}
              </td>
              <td>
                {record.nextFollowUpAt ? new Date(record.nextFollowUpAt).toLocaleDateString() : '-'}
              </td>
              <td>
                <button className="btn btn--sm">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="outreach-table__pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange?.(pagination.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange?.(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
