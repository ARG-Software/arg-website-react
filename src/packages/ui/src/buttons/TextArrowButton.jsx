import { arrowSvg } from '../icons/SocialIcons.jsx';

// The site's text button: a label with the diagonal arrow. On hover the label rolls up to
// `hoverLabel` and a hairline underline draws in; `roll` and `underline` turn either off.
// `as` renders it as a link, an AppLink or a button; other props go to that element.
export function TextArrowButton({
  as: Element = 'a',
  label,
  hoverLabel = label,
  dark = false,
  align = 'start',
  roll = true,
  underline = true,
  noWrap = false,
  labelAs,
  labelClassName = 'text-button_text',
  arrowClassName = '',
  listProps,
  className = '',
  ...props
}) {
  // A button may only hold phrasing content, so its parts are spans
  const Part = Element === 'button' ? 'span' : 'div';
  const Label = labelAs || Part;

  const classNames = ['text-button'];
  if (align !== 'start') classNames.push(`text-button--align-${align}`);
  if (!roll) classNames.push('text-button--static');
  if (!underline) classNames.push('text-button--no-underline');
  if (className) classNames.push(className);

  const listClassName = `text-button_list${dark ? ' is-dark' : ''}`;
  const textClassName = `${labelClassName}${noWrap ? ' text-no-wrap' : ''}`;
  const arrow = (
    <Part className={`arrow_icon-embed ${arrowClassName}`.trim()} aria-hidden="true">
      {arrowSvg}
    </Part>
  );

  return (
    <Element className={classNames.join(' ')} {...props}>
      <Part className={listClassName} {...listProps}>
        <Label className={textClassName}>{label}</Label>
        {arrow}
      </Part>
      {roll && (
        <Part className={`${listClassName} is-animated`} aria-hidden="true">
          <Label className={textClassName}>{hoverLabel}</Label>
          {arrow}
        </Part>
      )}
    </Element>
  );
}
