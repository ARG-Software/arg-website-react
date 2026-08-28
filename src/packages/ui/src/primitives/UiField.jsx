export function UiField({ label, hint, className = '', id, ...props }) {
  return (
    <label className={['ui-field', className].filter(Boolean).join(' ')} htmlFor={id}>
      {label && <span className="ui-field__label">{label}</span>}
      <input id={id} className="ui-field__control" {...props} />
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}

export function UiSelect({ label, labelHidden = false, children, className = '', id, ...props }) {
  return (
    <label className={['ui-field', className].filter(Boolean).join(' ')} htmlFor={id}>
      {label && (
        <span
          className={labelHidden ? 'ui-field__label ui-field__label--hidden' : 'ui-field__label'}
        >
          {label}
        </span>
      )}
      <select id={id} className="ui-field__control" {...props}>
        {children}
      </select>
    </label>
  );
}

export function UiTextarea({ label, className = '', id, ...props }) {
  return (
    <label className={['ui-field', className].filter(Boolean).join(' ')} htmlFor={id}>
      <span className="ui-field__label">{label}</span>
      <textarea id={id} className="ui-field__control ui-field__control--textarea" {...props} />
    </label>
  );
}
