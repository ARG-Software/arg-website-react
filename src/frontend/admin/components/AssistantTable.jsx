export function AssistantTable({ conversations = [], onDelete }) {
  if (!conversations.length) {
    return <div className="assistant-table__empty">No conversations found</div>;
  }

  return (
    <div className="assistant-table">
      <table>
        <thead>
          <tr>
            <th>Visitor</th>
            <th>Page</th>
            <th>Started</th>
            <th>Messages</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map(conv => (
            <tr key={conv.id}>
              <td>{conv.visitorId || 'Anonymous'}</td>
              <td>{conv.page || '-'}</td>
              <td>{conv.createdAt ? new Date(conv.createdAt).toLocaleDateString() : '-'}</td>
              <td>{conv.messageCount || 0}</td>
              <td>
                <button className="btn btn--danger btn--sm" onClick={() => onDelete?.(conv.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
