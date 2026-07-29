import { useLocation, useNavigate } from 'react-router-dom';
import { useHashScroll } from '@hooks/useHashScroll';
import { normalizePathname } from '@utils/helpers';

function isModifiedClick(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

function getDestination(href) {
  if (!href || typeof window === 'undefined') return null;

  try {
    const url = new URL(href, window.location.href);

    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash ? url.hash.slice(1) : '',
      path: `${url.pathname}${url.search}${url.hash}`,
    };
  } catch {
    return null;
  }
}

export function ChatbotLink({ href, external = false, onClick, children, target, rel, ...rest }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollToHash, scrollToHashWhenReady } = useHashScroll();
  const linkTarget = external ? (target ?? '_blank') : target;
  const linkRel = linkTarget === '_blank' ? (rel ?? 'noopener noreferrer') : rel;

  return (
    <a
      href={href}
      target={linkTarget}
      rel={linkRel}
      {...rest}
      onClick={event => {
        onClick?.(event);

        if (event.defaultPrevented) return;
        if (external || event.button !== 0 || isModifiedClick(event)) return;
        if (linkTarget && linkTarget !== '_self') return;

        const destination = getDestination(href);
        if (!destination) return;

        event.preventDefault();

        const isSamePath =
          normalizePathname(destination.pathname) === normalizePathname(location.pathname) &&
          destination.search === location.search;

        if (destination.hash && isSamePath) {
          scrollToHash(destination.hash, { mobileMenuDelay: 0, updateUrl: true });
          return;
        }

        navigate(destination.path);

        if (destination.hash) {
          scrollToHashWhenReady(destination.hash, {
            mobileMenuDelay: 0,
            initialDelay: 0,
            updateUrl: false,
          });
        }
      }}
    >
      {children}
    </a>
  );
}
