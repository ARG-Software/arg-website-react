export function AdminNav({ items, onNavigate }) {
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {items.map(item => (
        <a
          key={item.href}
          className={item.isActive ? 'is-active' : ''}
          href={item.href}
          onClick={event => {
            if (!onNavigate) return;
            event.preventDefault();
            onNavigate(item.href, item);
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
