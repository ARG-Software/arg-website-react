import { trackEvent } from '../../hooks/useAnalytics';
import { usePageTransition } from '../../hooks/usePageTransition';

export default function AppLink({
  to,
  children,
  onClick,
  replace,
  state,
  preventScrollReset,
  relative,
  unstable_viewTransition,
  trackEvent: trackEventName,
  trackData,
  ...rest
}) {
  const { go } = usePageTransition();

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

        if (trackEventName) {
          trackEvent(trackEventName, trackData ?? {});
        }

        event.preventDefault();
        go(to, Object.keys(options).length > 0 ? options : undefined);
      }}
    >
      {children}
    </a>
  );
}
