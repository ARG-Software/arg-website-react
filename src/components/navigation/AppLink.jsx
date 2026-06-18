import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../../hooks/useAnalytics';
import { TransitionContext } from '../../providers/TransitionProvider';
import { normalizePathname } from '../../utils/helpers';

function getSamePageHash(to, currentPathname) {
  if (typeof to !== 'string') return null;

  const hashIndex = to.indexOf('#');
  if (hashIndex === -1) return null;

  const hash = to.slice(hashIndex + 1);
  if (!hash) return null;

  const targetPathname = to.slice(0, hashIndex) || currentPathname;
  return normalizePathname(targetPathname) === normalizePathname(currentPathname) ? hash : null;
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
  getTransitionOptions,
  trackEvent: trackEventName,
  trackData,
  ...rest
}) {
  const location = useLocation();
  const { go, scrollToHash } = useContext(TransitionContext);

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
        const samePageHash = getSamePageHash(to, location.pathname);
        if (samePageHash) {
          scrollToHash(samePageHash);
          return;
        }

        const transitionOptions = getTransitionOptions?.(event) ?? {};
        go(
          to,
          Object.keys({ ...options, ...transitionOptions }).length > 0
            ? { ...options, ...transitionOptions }
            : undefined
        );
      }}
    >
      {children}
    </a>
  );
}
