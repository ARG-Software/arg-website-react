import { AnimatedArrowButton } from '../buttons/AnimatedArrowButton.jsx';

export function Navbar({
  logo,
  menuOpen = false,
  navStyle,
  meetingHref,
  meetingLabel = 'Book a Meeting',
  meetingHoverLabel = 'No commitment',
  onMeetingClick,
  onMenuToggle,
  renderHomeLink = defaultRenderHomeLink,
}) {
  return (
    <div
      className="nav_wrap padding-global"
      data-animate-scope
      data-animate-default-stagger="300"
      data-animation="default"
      data-easing2="ease-in"
      data-easing="ease-in"
      data-collapse="all"
      role="banner"
      data-no-scroll="1"
      data-duration="400"
      style={navStyle}
    >
      <div className="nav_contain container" style={{ background: 'transparent' }}>
        <div style={{ opacity: 1 }} className="nav-component">
          {renderHomeLink({
            className: 'nav_logo-wrapper',
            children: <div className="nav_logo_icon">{logo}</div>,
            'aria-label': 'Arg Software',
            'data-animate': 'fade-up',
            'data-animate-trigger': 'load',
            'data-animate-order': '0',
          })}

          <div
            className="nav_buttons-wrapper"
            data-animate="fade-up"
            data-animate-trigger="load"
            data-animate-order="1"
          >
            <AnimatedArrowButton
              href={meetingHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              hoverText={meetingHoverLabel}
              onClick={onMeetingClick}
            >
              {meetingLabel}
            </AnimatedArrowButton>
            <button
              className={`nav-hamburger${menuOpen ? ' is-open' : ''}`}
              onClick={onMenuToggle}
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="menu-icon z-index-2" aria-hidden="true">
                <span className="menu_icon-line is--top"></span>
                <span className="menu_icon-line is--bottom"></span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultRenderHomeLink({ children, className, ...props }) {
  return (
    <a href="/" className={className} {...props}>
      {children}
    </a>
  );
}
