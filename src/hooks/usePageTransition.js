import { useContext } from 'react';
import { TransitionContext } from '../providers/TransitionProvider';

/**
 * usePageTransition - Hook to access page transition functionality.
 * Provides navigation with smooth transitions between pages.
 *
 * @returns {Object} Transition context with:
 *   - go: Function to navigate to a new page with transition
 *   - phase: Current transition phase ('idle', 'covering', 'revealing')
 *   - scrollToHash: Function to scroll to hash within same page
 *   - createHashScrollHandler: Function to create click handler for hash scrolling
 *   - scrollToPage: Function to scroll to top of page
 *
 * @throws {Error} If used outside TransitionProvider
 */
export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error('usePageTransition must be used inside TransitionProvider');
  return ctx;
}
