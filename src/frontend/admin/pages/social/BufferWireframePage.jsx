import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiField, UiSelect, UiTextarea } from '@ui/primitives/UiField.jsx';

export default function BufferWireframePage() {
  return (
    <div className="admin-buffer-wireframe">
      <UiCard className="admin-buffer-card" tone="light">
        <h2>Connect Buffer</h2>
        <p>
          This is a layout for Buffer login and API management. Live posting still happens in
          Buffer. Sent LinkedIn posts are synced into Social → Posts.
        </p>
        <form className="admin-form" onSubmit={event => event.preventDefault()}>
          <UiField
            id="buffer-email"
            label="Email"
            value=""
            placeholder="you@arg.software"
            disabled
          />
          <UiField
            id="buffer-password"
            label="Password"
            type="password"
            value=""
            placeholder="••••••••"
            disabled
          />
          <div className="admin-detail-form__actions">
            <UiButton type="button" disabled>
              Log in to Buffer
            </UiButton>
          </div>
        </form>
      </UiCard>

      <UiCard className="admin-buffer-card" tone="light">
        <h2>API access</h2>
        <p>
          The site reads Buffer with BUFFER_API_KEY from the server environment. The key is never
          shown here.
        </p>
        <form className="admin-form" onSubmit={event => event.preventDefault()}>
          <UiField
            id="buffer-api-key"
            label="API key"
            value="buf_••••••••••••••••"
            disabled
            hint="Create and rotate keys in Buffer Settings → API."
          />
          <div className="admin-detail-form__actions">
            <a
              className="admin-retry"
              href="https://publish.buffer.com/settings/api"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Buffer API settings
            </a>
          </div>
        </form>
      </UiCard>

      <UiCard className="admin-buffer-card admin-buffer-card--wide" tone="light">
        <h2>Compose</h2>
        <form className="admin-form" onSubmit={event => event.preventDefault()}>
          <UiSelect id="buffer-channel" label="Channel" disabled>
            <option>LinkedIn · ARG Software</option>
          </UiSelect>
          <UiTextarea
            id="buffer-copy"
            label="Post text"
            rows={6}
            disabled
            placeholder="Write the LinkedIn post here."
          />
          <UiField id="buffer-image" label="Image URL" value="" placeholder="https://" disabled />
          <div className="admin-detail-form__actions">
            <UiButton type="button" disabled>
              Add to queue
            </UiButton>
            <UiButton type="button" disabled>
              Share now
            </UiButton>
          </div>
        </form>
      </UiCard>

      <UiCard className="admin-buffer-card admin-buffer-card--wide" tone="light">
        <h2>Queue</h2>
        <p className="admin-data-table__empty">No scheduled Buffer posts in this wireframe.</p>
      </UiCard>
    </div>
  );
}
