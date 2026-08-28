import { UiCard } from '@ui/primitives/UiCard.jsx';

export default function HelpPage() {
  return (
    <UiCard className="admin-help-card" tone="light">
      <h1>Admin help</h1>
      <section className="admin-help-section">
        <h2>Import outreach CSV</h2>
        <p>
          Use Export CSV first when you need a template. Keep the same column names, edit the rows
          you want to add, then import a CSV file from the admin navigation.
        </p>
        <ol>
          <li>Prepare a CSV with no more than 30 data rows per import.</li>
          <li>
            Keep <code>companyName</code> filled in for every row.
          </li>
          <li>
            Use <code>sent</code> or <code>not_sent</code> for <code>status</code>.
          </li>
          <li>
            Use <code>email</code> or <code>contact_form</code> for <code>contactMethod</code>.
          </li>
          <li>
            Use <code>YYYY-MM-DD</code> for <code>dateSent</code> and <code>followUpDate</code>.
          </li>
          <li>
            Set <code>replyObtained</code> to <code>true</code> only when a sent record already has
            a reply.
          </li>
        </ol>
      </section>
      <section className="admin-help-section">
        <h2>Duplicate checks</h2>
        <p>
          Imports reject rows when the normalized company name or contact email already exists.
          Company names and contact emails stay encrypted at rest, and the duplicate check uses
          blind indexes.
        </p>
      </section>
      <section className="admin-help-section">
        <h2>After importing</h2>
        <p>
          Refresh the admin view if needed, then review imported rows in All emails before sending
          or editing outreach details.
        </p>
      </section>
    </UiCard>
  );
}
