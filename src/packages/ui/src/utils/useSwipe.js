import { useEffect, useRef } from 'react';

/**
 * Touch swipe on one axis. Once the gesture is clearly that axis, page scroll is
 * blocked so Lenis is not interrupted on the other axis.
 * onSwipe(1) is forward (left or up), onSwipe(-1) is back.
 */
export function useSwipe(ref, onSwipe, { axis = 'x', threshold = 40, canMove } = {}) {
  const onSwipeRef = useRef(onSwipe);
  const canMoveRef = useRef(canMove);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
    canMoveRef.current = canMove;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    let startX = null;
    let startY = null;
    let locked = null;

    const onStart = event => {
      const touch = event.changedTouches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      locked = null;
    };

    const onMove = event => {
      if (startX == null) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const primary = axis === 'x' ? dx : dy;
      const secondary = axis === 'x' ? dy : dx;
      if (locked == null && (Math.abs(primary) > 8 || Math.abs(secondary) > 8)) {
        locked = Math.abs(primary) > Math.abs(secondary) ? axis : 'other';
      }
      if (locked !== axis) return;
      const delta = primary < 0 ? 1 : -1;
      if (canMoveRef.current && !canMoveRef.current(delta)) return;
      event.preventDefault();
    };

    const onEnd = event => {
      if (startX == null) return;
      const touch = event.changedTouches[0];
      const primary = axis === 'x' ? touch.clientX - startX : touch.clientY - startY;
      startX = null;
      if (locked !== axis || Math.abs(primary) < threshold) return;
      const delta = primary < 0 ? 1 : -1;
      if (canMoveRef.current && !canMoveRef.current(delta)) return;
      onSwipeRef.current(delta);
    };

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: false });
    element.addEventListener('touchend', onEnd);
    return () => {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
    };
  }, [ref, axis, threshold]);
}
