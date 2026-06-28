import { arrowSvg } from '../icons/SocialIcons';

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
}) {
  const buttonClassName = ['button-base', 'button-contact', 'form-card__submit-button', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClassName} type={type}>
      <span className="button-base_text_wrap">
        <span className="button-base__button-text">{children}</span>
        <span className="button-base__button-text is-animated">{hoverText}</span>
      </span>
      <span className="arrow_icon-embed" aria-hidden="true">
        {arrowSvg}
      </span>
    </button>
  );
}
