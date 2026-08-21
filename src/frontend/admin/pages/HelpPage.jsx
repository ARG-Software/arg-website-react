export default function HelpPage() {
  return (
    <div className="help-page">
      <h2>Admin Help</h2>

      <section className="help-section">
        <h3>Outreach Management</h3>
        <p>
          The Outreach section allows you to manage contact records for potential clients. You can
          filter records by status, search by company name or contact information, and update the
          status of each outreach attempt.
        </p>
        <ul>
          <li>
            <strong>Filters:</strong> Use the status filter to show All, Pending, Contacted, or
            Replied records.
          </li>
          <li>
            <strong>Search:</strong> Search by company name, email, or other contact details.
          </li>
          <li>
            <strong>Status Updates:</strong> Click on a status badge to change the outreach status.
          </li>
          <li>
            <strong>Pagination:</strong> Navigate through pages using the controls at the bottom of
            the table.
          </li>
        </ul>
      </section>

      <section className="help-section">
        <h3>Assistant Conversations</h3>
        <p>
          This section displays conversations between website visitors and the AI assistant. You can
          review conversation history and delete conversations if necessary.
        </p>
      </section>

      <section className="help-section">
        <h3>Settings</h3>
        <p>
          Update your profile information and change your password in the Settings section. Your
          email address cannot be changed.
        </p>
      </section>

      <section className="help-section">
        <h3>Session Management</h3>
        <p>
          For security, your session will automatically expire after 1 hour of inactivity. You will
          be redirected to the login page when this happens.
        </p>
      </section>
    </div>
  );
}
