import { FormCard, FormSubmitButton } from './FormCard.jsx';

export default {
  title: 'Forms/FormCard',
  component: FormCard,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'ARG dark' } },
};

export function ContactForm() {
  return (
    <main className="storybook-showcase storybook-showcase--center">
      <section className="storybook-form-shell">
        <FormCard
          title="Request access"
          description="A reusable form shell for product flows, contact screens, and admin panels."
          submit={<FormSubmitButton hoverText="Submit request">Submit request</FormSubmitButton>}
        >
          <div className="form-card__grid">
            <label>
              <span>Workspace</span>
              <input placeholder="Acme team" />
            </label>
            <label>
              <span>Email</span>
              <input placeholder="hello@example.com" />
            </label>
          </div>
          <label>
            <span>Message</span>
            <textarea placeholder="Tell us what you want to configure..." />
          </label>
        </FormCard>
      </section>
    </main>
  );
}
