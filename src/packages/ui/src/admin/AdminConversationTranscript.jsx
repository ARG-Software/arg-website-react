export function AdminConversationTranscript({
  messages = [],
  emptyMessage = 'No messages found.',
}) {
  if (!messages.length) {
    return <p className="admin-conversation-transcript__empty">{emptyMessage}</p>;
  }

  return (
    <div className="admin-conversation-transcript">
      {messages.map((message, index) => (
        <article
          key={`${message.role}-${message.createdAt || index}`}
          className={`admin-conversation-message admin-conversation-message--${message.role}`}
        >
          <div className="admin-conversation-message__meta">
            <span>{message.role === 'assistant' ? 'Gaspar' : 'Visitor'}</span>
            {message.createdAt && (
              <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
            )}
          </div>
          <p>{message.content}</p>
          {message.citations?.length > 0 && (
            <ConversationReferences title="Citations" items={message.citations} />
          )}
          {message.articleRecommendations?.length > 0 && (
            <ConversationReferences
              title="Article recommendations"
              items={message.articleRecommendations}
            />
          )}
          {message.actions?.length > 0 && (
            <div className="admin-conversation-message__actions">
              <span>Actions</span>
              <ul>
                {message.actions.map((action, actionIndex) => (
                  <li key={`${action.type}-${actionIndex}`}>{action.type}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function ConversationReferences({ title, items }) {
  return (
    <div className="admin-conversation-message__refs">
      <span>{title}</span>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.url || item.title}-${index}`}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title || item.url}
              </a>
            ) : (
              item.title
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
