export function CareersFounderCard({ founder, animateOrder, onEmailClick, onLinkedInClick }) {
  return (
    <article className="cp-founder-card" data-animate="fade-up" data-animate-order={animateOrder}>
      <div className="cp-founder-monogram" aria-hidden="true">
        {founder.initials}
      </div>
      <div className="cp-founder-content">
        <h3>{founder.name}</h3>
        <p className="cp-founder-role">{founder.role}</p>
        <p className="cp-founder-bio">{founder.bio}</p>

        <div className="cp-founder-focus" aria-label={`What to talk to ${founder.name} about`}>
          <div>
            <span className="cp-founder-focus-key">Talk about</span>
            <span className="cp-founder-focus-value">{founder.focus}</span>
          </div>
          <div>
            <span className="cp-founder-focus-key">Reply time</span>
            <span className="cp-founder-focus-value">{founder.replyTime}</span>
          </div>
        </div>

        <div className="cp-founder-links">
          <a href={founder.emailHref} onClick={() => onEmailClick(founder.name)}>
            Email
          </a>
          <a
            href={founder.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onLinkedInClick(founder.name)}
          >
            LinkedIn
          </a>
        </div>
      </div>
    </article>
  );
}
