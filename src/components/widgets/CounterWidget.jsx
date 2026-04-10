import React from 'react';

/**
 * CounterWidget - Reusable statistic component with count-up animation.
 * Supports two variants: 'compact' (StatsGrid) and 'expanded' (WorkStatsSection).
 */
export function CounterWidget({
  value,
  label,
  imageSrc,
  imageAlt = '',
  showLine = false,
  variant = 'compact',
  className = '',
  ...props
}) {
  const isCompact = variant === 'compact';
  const isExpanded = variant === 'expanded';

  // Determine count-up attribute: expanded uses fs-numbercount-*, compact uses data-end
  const countUpProps = isExpanded
    ? {
        'fs-numbercount-element': 'number',
        'fs-numbercount-start': '0',
        'fs-numbercount-end': value,
      }
    : { 'data-end': value };

  return (
    <div
      className={`
        ${isCompact ? 'prp-stat-item' : 'work-item'}
        ${className}
      `.trim()}
      {...props}
    >
      {showLine && <div className="work-item_line" />}

      {isCompact ? (
        // Compact layout (StatsGrid)
        <>
          <div className="prp-stat-num">
            <span className="prp-count" {...countUpProps}>
              0
            </span>
            +
          </div>
          <div className="prp-stat-label">{label}</div>
        </>
      ) : (
        // Expanded layout (WorkStatsSection)
        <>
          {showLine && <div className="padding-bottom padding-medium" />}
          <div className="count-up_wrap">
            <h3 className="heading-style-h2 z-index-2 count-up" {...countUpProps}>
              0
            </h3>
            <h3 className="heading-style-h2 z-index-2">+</h3>
          </div>
          <div className="padding-bottom padding-22" />
          <p className="text-color-grey z-index-2">{label}</p>
          {imageSrc && (
            <div className="work_image-wrapper">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="work-image"
                width="160"
                height="160"
                loading="lazy"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
