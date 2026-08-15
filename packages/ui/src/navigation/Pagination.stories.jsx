import { useState } from 'react';

import { arrowSvg } from '../icons/SocialIcons.jsx';
import { Pagination } from './Pagination.jsx';

export default {
  title: 'Navigation/Pagination',
  component: Pagination,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'White' } },
};

export function PageControls() {
  const [page, setPage] = useState(4);

  return (
    <main className="storybook-showcase storybook-showcase--light storybook-showcase--center">
      <section className="storybook-frame storybook-frame--md storybook-section">
        <div className="storybook-section__head">
          <p className="storybook-eyebrow">Pagination</p>
          <h1 className="storybook-title storybook-title--sm">Paged product navigation.</h1>
        </div>
        <div className="storybook-panel">
          <Pagination page={page} totalPages={12} onPageChange={setPage} arrowIcon={arrowSvg} />
        </div>
      </section>
    </main>
  );
}
