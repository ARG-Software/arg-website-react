export function UiDatePicker({ label, hint, className = '', id, ...props }) {
  return (
    <label className={['ui-field', className].filter(Boolean).join(' ')} htmlFor={id}>
      {label && <span className="ui-field__label">{label}</span>}
      <input id={id} className="ui-field__control" type="date" {...props} />
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}
