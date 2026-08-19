import { AnimatedArrowButton } from '../buttons/AnimatedArrowButton.jsx';

export function FormCard({ title, description, children, submit, className = '', ...formProps }) {
  const formClassName = ['form-card', className].filter(Boolean).join(' ');

  return (
    <form className={formClassName} {...formProps}>
      {(title || description) && (
        <div className="form-card__header">
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </div>
      )}

      {children}

      {submit && <div className="form-card__submit-row">{submit}</div>}
    </form>
  );
}

export function FormSubmitButton({
  children,
  hoverText = children,
  className = '',
  type = 'submit',
  disabled = false,
}) {
  return (
    <AnimatedArrowButton
      className={`form-card__submit-button ${className}`.trim()}
      type={type}
      disabled={disabled}
      hoverText={hoverText}
    >
      {children}
    </AnimatedArrowButton>
  );
}
