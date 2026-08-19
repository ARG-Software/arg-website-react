import { useContext } from 'react';
import { trackEvent } from '../../utils/analytics';
import { TransitionContext } from '../../providers/TransitionProvider';

function isModifiedClick(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export default function AppLink({
  to,
  children,
  onClick,
  replace,
  state,
  preventScrollReset,
  relative,
  unstable_viewTransition,
  transition = 'page',
  getTransitionOptions,
  trackEvent: trackEventName,
  trackData,
  ...rest
}) {
  const { go } = useContext(TransitionContext);

  const options = {
    replace,
    state,
    preventScrollReset,
    relative,
    unstable_viewTransition,
  };

  // Remove undefined options to keep the object clean
  Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

  return (
    <a
      href={to}
      {...rest}
      onClick={event => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0 || isModifiedClick(event)) return;
        if (rest.target && rest.target !== '_self') return;

        if (trackEventName) {
          trackEvent(trackEventName, trackData ?? {});
        }

        event.preventDefault();
        const transitionOptions = getTransitionOptions?.(event) ?? {};
        go(to, { ...options, transition, ...transitionOptions });
      }}
    >
      {children}
    </a>
  );
}
