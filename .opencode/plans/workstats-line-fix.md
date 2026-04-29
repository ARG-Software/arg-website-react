# Fix: WorkStats Line Animation Delay Support

## Root Cause
`getTotalDelay` only checks for `data-animate-stagger` on the parent (Priority 1), not `data-animate-default-stagger`. When using a new scope with `data-animate-default-stagger`, it falls through to Priority 2 which may not properly calculate the delay.

## Fix
**File:** `src/hooks/useScrollAnimations.js`

**Location:** Lines 122-128 in `getTotalDelay`

**Change:** Update Priority 1 to also check for `data-animate-default-stagger`:

```javascript
// Current:
if (parent && parent.hasAttribute('data-animate-stagger')) {
  const parentStagger = parseInt(parent.getAttribute('data-animate-stagger')) || 0;
  const parentDelay = parseInt(parent.getAttribute('data-animate-delay')) || 0;
  const childIndex = Array.from(parent.children).indexOf(element);
  return parentDelay + parentStagger * childIndex;
}

// Fixed:
if (parent && (parent.hasAttribute('data-animate-stagger') || parent.hasAttribute('data-animate-default-stagger'))) {
  const parentStagger = parseInt(parent.getAttribute('data-animate-stagger') || parent.getAttribute('data-animate-default-stagger')) || 0;
  const parentDelay = parseInt(parent.getAttribute('data-animate-delay') || parent.getAttribute('data-animate-default-delay')) || 0;
  const childIndex = Array.from(parent.children).indexOf(element);
  return parentDelay + parentStagger * childIndex;
}
```

This ensures that when you use a new scope with `data-animate-default-stagger` and `data-animate-delay`, the delay is properly calculated and respected.
