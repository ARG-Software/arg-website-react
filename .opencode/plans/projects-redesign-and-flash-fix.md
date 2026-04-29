# Implementation Plan - Menu Flash Fix & Projects Page Redesign

## Decisions Made
- **Stats grid**: Remove entirely from projects section
- **Page transitions**: Use existing curtain transition system (already configured at 380ms with `#0c002e`)
- **Colors**: Adapt to brand palette:
  - Primary dark: `#0c002e` (deep purple)
  - Gradient: `#f0060d` → `#c924d7` → `#0c002e`
  - Secondary dark: `#261b44`
  - Light: `#ededed`, `#ffffff`
  - Text: `#474747` (muted), `#111111` (strong)

---

## 1. Commit Current Changes (Safety)

**Command**: `git add -A && git commit -m "feat: redesign blog promo grid, fix team/FAQ animations, clean duplicate CSS"`

---

## 2. Fix Menu Flash on Reload (LoadingProvider.jsx)

**Problem**: On returning visits (when `loadingScreenSeen` is true), React renders children immediately but there's a brief moment where the page is loading, causing a flash of unstyled content.

**Fix**: Add a `ready` state that delays rendering children by 150ms when skipping the loading screen.

**Changes to `src/providers/LoadingProvider.jsx`**:
- Add `const [ready, setReady] = useState(!shouldShow);`
- Add effect: when `!shouldShow`, `setTimeout(() => setReady(true), 150)`
- Wrap `{children}` in: `<div style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.15s ease' }}>{children}</div>`

---

## 3. Update projects.json with Slug Fields

**File**: `src/data/projects.json`

Add a `slug` field to each project for routing:
- `mojaloop`
- `dokutar`
- `sky-tracks`
- `tv-cine`
- `royalty-flush`
- `vector`

---

## 4. Create ProjectDetail Page Component

**File**: `src/pages/ProjectDetailPage.jsx` (new)

**Structure** (matching Good Fella reference):
- Full-viewport dark hero (`#0c002e`) with project title, industry badge, and live link
- Large hero image (16:8 aspect ratio)
- Alternating dark (`#0c002e`)/light (`#ededed`) sections for problem/solution content
- Two-column layout:
  - Left column: Problem description, solution text
  - Right column: Project metadata (stack, logos, live link)
- Mockup showcase section
- Tech stack tags with brand gradient accent
- "Next project" navigation at bottom
- CTA section at end (reuse existing `.prp-cta`)

**Key features**:
- Uses `useParams` to get slug from URL
- Finds matching project from `projects.json`
- Falls back to 404 if project not found
- Scroll animations via `useScrollAnimations`
- SEO component for meta tags
- Uses existing page transition system (no extra work needed)

---

## 5. Redesign ProjectsPage (Listing)

**File**: `src/pages/ProjectsPage.jsx` (rewrite)

**Structure** (matching Good Fella reference):
- Full-viewport dark hero (`#0c002e`) with large typography: "They trusted us. It's your time now."
- NO stats grid (removed per request)
- Project cards in a list layout:
  - Each card is a full-width section alternating dark (`#0c002e`)/light (`#ededed`)
  - Left side: Project number (01, 02...), title, industry badge
  - Right side: Brief description, "View project" link with arrow
  - Hover effect: subtle scale/translate on image
- CTA section at bottom with gradient text

**Key changes from current**:
- Remove modal-based interaction
- Replace with routed links to `/projects/:slug`
- Remove stats grid entirely
- Simplify card layout (no full problem/solution text on listing)
- Use `Link` from react-router-dom with `go()` from TransitionContext for transitions

---

## 6. Add Routing for Project Detail Pages

**File**: `src/main.jsx`

Add route:
```jsx
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage.jsx'));

// In Routes:
<Route path="/projects/:slug" element={<ProjectDetailPage />} />
<Route path="/projects/:slug/" element={<ProjectDetailPage />} />
```

---

## 7. Create CSS for New Projects Design

**File**: `src/styles/projects.css` (rewrite)

**Color system**:
- Dark sections: `background: #0c002e`
- Light sections: `background: #ededed`
- Dark text on light: `color: #111111`
- Light text on dark: `color: #ffffff`, `rgba(255,255,255,0.5)` for muted
- Gradient accent: `linear-gradient(90deg, #f0060d, #c924d7 49%, #0c002e)`
- Borders on dark: `rgba(255,255,255,0.1)`
- Borders on light: `rgba(0,0,0,0.1)`

**New styles needed**:
- `.prp-listing-hero` - Full viewport dark hero with `#0c002e`
- `.prp-project-card` - Alternating dark/light sections
- `.prp-project-card:nth-child(even)` - Light background (`#ededed`)
- `.prp-card-number` - Large index number
- `.prp-card-title` - Project title typography
- `.prp-card-industry` - Badge styling
- `.prp-card-preview` - Image preview with hover effect
- `.prp-card-link` - "View project" link with arrow animation
- `.prp-detail-hero` - Detail page hero with `#0c002e`
- `.prp-detail-content` - Two-column layout
- `.prp-detail-sidebar` - Metadata sidebar
- `.prp-next-project` - Navigation to next project

**Reuse existing**:
- `.prp-cta` and related styles (keep as-is, already uses brand colors)
- `.prp-stack-tag` styling
- `.prp-logo-item` styling
- Responsive breakpoints

---

## 8. Create ProjectCard Component (for listing)

**File**: `src/components/projects/ProjectCard.jsx` (new)

Simplified card component for the listing page:
- Receives: `project`, `index`, `slug`
- Renders: number, title, industry, image, "View project" link
- Uses `Link` with `go()` for page transitions

---

## Execution Order

1. **Commit current changes** (safety checkpoint)
2. **Fix LoadingProvider.jsx** (quick win)
3. **Add slugs to projects.json**
4. **Create ProjectCard.jsx** (new component)
5. **Create ProjectDetailPage.jsx** (new page)
6. **Rewrite ProjectsPage.jsx** (listing page)
7. **Rewrite projects.css** (new styles with brand colors)
8. **Update main.jsx routing**
9. **Test all pages and responsiveness**

---

## Tradeoffs & Considerations

- **LoadingProvider delay**: 150ms is imperceptible but prevents flash. Uses `setTimeout` for simplicity.
- **ProjectCard as separate component**: Cleaner separation of concerns, easier to maintain.
- **CSS rewrite**: Full rewrite ensures clean code. Will preserve responsive breakpoints.
- **Page transitions**: Already implemented via `TransitionProvider` — just need to use `go()` from context for navigation.
- **SEO**: Each project detail page gets unique meta tags via the SEO component.
- **Color consistency**: All dark sections use `#0c002e` (not `#000`) to match brand identity.
