update public.architect_releases
set
  name = 'First public release',
  body = $body$First public release of ARG Architect, the free browser extension that audits a public page in one click.

- One weighted score across security, performance, architecture, payload, accessibility, AI readiness and DOM
- Reports stay on the device
- Listed on the Chrome Web Store$body$,
  updated_at = now()
where tag_name = 'v1.0.0';

update public.architect_releases
set
  name = 'Release checks',
  body = $body$Release and CI checks around every tagged version.

- Type-check, tests and both builds on pull requests to main
- A GitHub Release is published for each version tag$body$,
  updated_at = now()
where tag_name = 'v1.0.1';

update public.architect_releases
set
  name = 'Saved reports and compare',
  body = $body$Saved reports, a clearer compare view, and a mobile viewport check.

- Up to 30 saved reports, with no expiry; new audits are blocked at the limit
- Compare rows show the name and whether the value changed; the numbers sit in the expanded tiles
- Accessibility scores the mobile viewport
- PDF and Markdown exports include the ARG site line$body$,
  updated_at = now()
where tag_name = 'v1.1.0';

update public.architect_releases
set
  body = trim(both E'\n' from regexp_replace(
    regexp_replace(
      body,
      'Full Changelog[^[:cntrl:]]*',
      '',
      'gi'
    ),
    '[^[:cntrl:]]*github\.com/ARG-Software/arg-architect[^[:cntrl:]]*',
    '',
    'gi'
  )),
  updated_at = now()
where body ~* 'Full Changelog' or body ~* 'github.com/ARG-Software/arg-architect';
