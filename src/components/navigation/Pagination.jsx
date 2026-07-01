function getVisiblePages(page, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items = [];
  const add = value => {
    if (value < 1 || value > totalPages) return;
    if (items.length && items[items.length - 1] === value) return;
    items.push(value);
  };
  const addGap = () => {
    if (items.length && items[items.length - 1] !== 'gap') {
      items.push('gap');
    }
  };

  add(1);
  add(2);

  if (page <= 3) {
    add(3);
    add(4);
  } else if (page >= totalPages - 2) {
    add(totalPages - 3);
    add(totalPages - 2);
  } else {
    addGap();
    add(page - 1);
    add(page);
    add(page + 1);
  }

  if (totalPages > 2) {
    addGap();
    add(totalPages);
  }

  return items;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className = '',
  ariaLabel = 'Pagination',
  arrowIcon,
  animateOrder,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const items = getVisiblePages(page, totalPages);
  const navClassName = `blp-pagination${className ? ` ${className}` : ''}`;
  const scopeAttrs = typeof animateOrder === 'number' ? { 'data-animate-order': animateOrder } : {};

  return (
    <nav className={navClassName} aria-label={ariaLabel} {...scopeAttrs}>
      <button
        type="button"
        className="blp-pagination-arrow"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        {arrowIcon}
      </button>

      {items.map((item, index) => {
        if (item === 'gap') {
          return (
            <span key={`gap-${index}`} className="blp-pagination-ellipsis" aria-hidden="true">
              …
            </span>
          );
        }

        return (
          <button
            key={item}
            type="button"
            className={`blp-pagination-num${item === page ? ' is-active' : ''}`}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        className="blp-pagination-arrow blp-pagination-arrow--next"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        {arrowIcon}
      </button>
    </nav>
  );
}
