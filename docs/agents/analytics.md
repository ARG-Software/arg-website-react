# Analytics

Read before adding or changing GA4 tracking. Moved from AGENTS.md.

## Centralized Tracking (`src/frontend/utils/analytics.js`)
All GA4 events go through this module. Never call `window.gtag()` directly.

| Function | Event | Parameters |
|---|---|---|
| `trackEvent(name, params)` | arbitrary | Generic GA4 event |
| `trackPageView(path, title)` | `page_view` | `page_path`, `page_title` |
| `trackCTA(type, location)` | `cta_click` | `cta_type`, `cta_location` |
| `trackOutbound(url, label, location)` | `outbound_click` | `link_url`, `link_label`, `link_location` |
| `trackSocial(platform, location)` | `social_click` | `platform`, `link_location` |
| `trackBlogPostShare(platform, slug)` | `blog_post_share` | `platform`, `blog_post_slug` |
| `trackMailto(subject, location)` | `mailto_click` | `subject`, `link_location` |
| `trackTimeOnPage(pagePath, seconds)` | `time_on_page` | `page_path`, `duration_seconds` |
| `trackFAQOpen(questionText)` | `faq_open` | `question` |
| `trackBlogPostClick(slug, title, location)` | `blog_post_click` | `blog_post_slug`, `blog_post_title`, `link_location` |
| `trackConsent(action)` | `cookie_consent` | `consent_action` |

## AppLink Component (`src/frontend/components/navigation/AppLink.jsx`)
- Wraps React Router's `<Link>` with optional analytics props
- Props: `trackEvent` (string), `trackData` (object)
- Fires `trackEvent(trackEvent, trackData)` BEFORE navigation
- Does NOT automatically track every click — explicit props required
- Use for client-side navigation that needs analytics

## useTimeOnPage Hook (`src/frontend/hooks/useTimeOnPage.js`)
- Takes `pagePath` (string) and optional `minSeconds` (default 5)
- Starts timer on mount, fires `time_on_page` event on unmount if threshold met
- Built-in 5-second minimum to filter accidental bounces

## Making a Link with Analytics
```jsx
// Internal navigation with tracking
<AppLink
  to="/projects/mojaloop/"
  trackEvent="project_click"
  trackData={{ project: 'mojaloop', location: 'homepage' }}
>
  View Project
</AppLink>

// External link with CTA tracking
<a
  href={getProjectBookingLink()}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => trackCTA('book_meeting', 'navbar')}
>
  Book a Meeting
</a>
```

## Tracking Time on Page
```jsx
export default function MyPage() {
  useTimeOnPage('/my-page/');  // fires time_on_page on unmount after 5s
  // ... rest of component
}
```
