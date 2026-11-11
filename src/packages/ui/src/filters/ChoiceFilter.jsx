import { PillButton } from '../pills/Pill.jsx';

export function ChoiceFilter({
  options = [],
  value,
  onChange,
  label = 'Filter',
  className = '',
  ...props
}) {
  if (!options.length) return null;

  return (
    <div className={`choice-filter ${className}`.trim()} {...props}>
      <div className="choice-filter__pills" role="group" aria-label={label}>
        {options.map(option => (
          <PillButton
            key={option}
            variant="dark"
            size="sm"
            active={option === value}
            aria-pressed={option === value}
            onClick={() => onChange?.(option)}
          >
            {option}
          </PillButton>
        ))}
      </div>
      <select
        className="choice-filter__select"
        value={value}
        aria-label={label}
        onChange={event => onChange?.(event.target.value)}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
