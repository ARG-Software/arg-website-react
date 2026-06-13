import { arrowSvg } from '../icons/SocialIcons';

export function JobAccordion({ job, isOpen, onToggle, onApply }) {
  const handleSubmit = event => {
    event.preventDefault();
    onApply?.(job);
  };

  return (
    <div className={`cp-job-item ${isOpen ? 'is-open' : ''}`}>
      <button className="cp-job-header" onClick={onToggle} aria-expanded={isOpen}>
        <div className="cp-job-info">
          <h3 className="cp-job-title">{job.title}</h3>
          <div className="cp-job-meta">
            <span className="cp-job-department">{job.department}</span>
            <span className="cp-job-separator">•</span>
            <span className="cp-job-location">{job.location}</span>
            <span className="cp-job-separator">•</span>
            <span className="cp-job-type">{job.type}</span>
          </div>
        </div>
        <div className="cp-job-toggle">
          <div className="cp-job-toggle-icon arrow_icon-embed w-embed">{arrowSvg}</div>
        </div>
      </button>
      <div className="cp-job-content">
        <div className="cp-job-content-inner">
          <p className="cp-job-description">{job.description}</p>
          <div className="cp-job-requirements">
            <h4>Requirements</h4>
            <ul>
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
          <form className="cp-job-form" onSubmit={handleSubmit}>
            <div className="cp-job-form-row">
              <div className="cp-form-group">
                <label htmlFor={`name-${job.id}`}>Full Name</label>
                <input type="text" id={`name-${job.id}`} name="name" required />
              </div>
              <div className="cp-form-group">
                <label htmlFor={`email-${job.id}`}>Email Address</label>
                <input type="email" id={`email-${job.id}`} name="email" required />
              </div>
            </div>
            <div className="cp-job-form-row">
              <div className="cp-form-group">
                <label htmlFor={`phone-${job.id}`}>Phone Number</label>
                <input type="tel" id={`phone-${job.id}`} name="phone" />
              </div>
              <div className="cp-form-group">
                <label htmlFor={`cv-${job.id}`}>CV / Resume</label>
                <input type="file" id={`cv-${job.id}`} name="cv" accept=".pdf,.doc,.docx" />
              </div>
            </div>
            <div className="cp-form-group">
              <label htmlFor={`cover-${job.id}`}>Cover Letter</label>
              <textarea
                id={`cover-${job.id}`}
                name="coverLetter"
                rows={4}
                placeholder="Tell us why you're interested in this role..."
              ></textarea>
            </div>
            <button type="submit" className="button-base button-contact">
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">Apply Now</div>
                <div className="button-base__button-text is-animated">Submit {arrowSvg}</div>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
