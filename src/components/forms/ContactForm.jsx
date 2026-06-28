import { useWeb3Form } from '../../hooks';
import { FormCard, FormSubmitButton } from './FormCard';

function getFieldId(formName, field) {
  return field.id || `${formName}-${field.name}`;
}

function renderField(formName, field) {
  const { label, options = [], type = 'text', ...fieldProps } = field;
  const id = getFieldId(formName, field);
  const sharedProps = {
    ...fieldProps,
    id,
  };

  return (
    <label key={field.name || id} className="form-card__field">
      <span>{label}</span>
      {type === 'textarea' ? (
        <textarea {...sharedProps} />
      ) : type === 'select' ? (
        <select {...sharedProps}>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} {...sharedProps} />
      )}
    </label>
  );
}

function renderFields(formName, fields) {
  const renderedFields = [];
  let gridFields = [];

  function flushGrid() {
    if (!gridFields.length) return;

    renderedFields.push(
      <div className="form-card__grid" key={`grid-${renderedFields.length}`}>
        {gridFields}
      </div>
    );
    gridFields = [];
  }

  fields.forEach(field => {
    const renderedField = renderField(formName, field);

    if (field.layout === 'half') {
      gridFields.push(renderedField);
      return;
    }

    flushGrid();
    renderedFields.push(renderedField);
  });

  flushGrid();
  return renderedFields;
}

function getStatusClassName(status) {
  if (status === 'success') return 'form-card__status is-success';
  if (status === 'error') return 'form-card__status is-error';
  if (status === 'loading') return 'form-card__status is-loading';

  return 'form-card__status is-idle';
}

export function ContactForm({
  title,
  description,
  fields,
  hiddenFields = [],
  submitLabel = 'Submit',
  submitHoverLabel = submitLabel,
  sendingLabel = 'Sending...',
  helperText,
  subject,
  source,
  formName = 'contact_form',
  className = '',
  resetOnSuccess = true,
  successMessage,
  errorMessage,
  onSubmit,
  onSuccess,
  onError,
  ...formProps
}) {
  const { status, result, isSubmitting, handleSubmit } = useWeb3Form({
    subject,
    source,
    formName,
    resetOnSuccess,
    successMessage,
    errorMessage,
    onSubmit,
    onSuccess,
    onError,
  });
  const statusText = status === 'idle' ? helperText : result;
  const statusClassName = getStatusClassName(status);
  const buttonText = isSubmitting ? sendingLabel : submitLabel;

  return (
    <FormCard
      title={title}
      description={description}
      className={className}
      onSubmit={handleSubmit}
      submit={
        <>
          <FormSubmitButton
            disabled={isSubmitting}
            hoverText={isSubmitting ? sendingLabel : submitHoverLabel}
          >
            {buttonText}
          </FormSubmitButton>
          {statusText && <span className={statusClassName}>{statusText}</span>}
        </>
      }
      {...formProps}
    >
      {hiddenFields.map(field => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <div className="form-card__hidden" aria-hidden="true">
        <label htmlFor={`${formName}-botcheck`}>Do not fill this field</label>
        <input id={`${formName}-botcheck`} type="checkbox" name="botcheck" tabIndex={-1} />
      </div>
      {renderFields(formName, fields)}
    </FormCard>
  );
}
