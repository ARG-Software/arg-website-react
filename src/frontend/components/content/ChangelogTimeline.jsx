import { useRef, useState } from 'react';
import { prefersReducedMotion } from '@utils/helpers';

const SLOT_COUNT = 48;
const LIFT_REM = 0.625;
const LIFT_RANGE = 9;

export function ChangelogTimeline({
  releases,
  years,
  selectedYear,
  selectedId,
  onSelectYear,
  onSelectRelease,
  label,
}) {
  const trackRef = useRef(null);
  const [hoverPct, setHoverPct] = useState(null);
  const ticks = buildTicks(releases);

  function handleMove(event) {
    if (prefersReducedMotion()) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    setHoverPct(((event.clientX - rect.left) / rect.width) * 100);
  }

  return (
    <div className="au-cl-bar" aria-label={label}>
      <div className="au-cl-bar-labels">
        {years.map((value, index) => (
          <button
            key={value}
            type="button"
            className={value === selectedYear ? 'au-cl-bar-year is-active' : 'au-cl-bar-year'}
            style={{ left: `${yearOffset(index, years.length)}%` }}
            onClick={() => onSelectYear(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        ref={trackRef}
        className="au-cl-bar-track"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverPct(null)}
      >
        {ticks.map((tick, index) => {
          const pct = yearOffset(index, ticks.length);
          const style = { transform: `translateY(-${tickLift(pct, hoverPct)}rem)` };

          if (tick.release) {
            return (
              <button
                key={tick.release.id}
                type="button"
                className={
                  selectedId === tick.release.id
                    ? 'au-cl-tick au-cl-tick--release is-active'
                    : 'au-cl-tick au-cl-tick--release'
                }
                style={style}
                aria-label={tick.release.tagName}
                onClick={() => onSelectRelease(tick.release)}
              />
            );
          }

          return (
            <span key={`slot-${index}`} className="au-cl-tick" style={style} aria-hidden="true" />
          );
        })}
      </div>
    </div>
  );
}

function tickLift(pct, hoverPct) {
  if (hoverPct == null) return 0;
  const distance = Math.abs(pct - hoverPct);
  if (distance > LIFT_RANGE * 2) return 0;
  return Math.exp(-(distance * distance) / (2 * LIFT_RANGE * LIFT_RANGE)) * LIFT_REM;
}

function yearOffset(index, count) {
  if (count <= 1) return 0;
  return (index / (count - 1)) * 100;
}

function buildTicks(releases) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => ({
    pct: SLOT_COUNT === 1 ? 50 : (index / (SLOT_COUNT - 1)) * 100,
    release: null,
  }));

  const sorted = [...releases].sort(
    (left, right) => new Date(left.publishedAt) - new Date(right.publishedAt)
  );
  if (!sorted.length) return slots;

  const times = sorted.map(release => new Date(release.publishedAt).getTime());
  const start = times[0];
  const end = times.at(-1);
  const span = Math.max(end - start, 1);
  const taken = new Set();

  sorted.forEach((release, index) => {
    const pct = sorted.length === 1 ? 50 : ((times[index] - start) / span) * 100;
    let slot = nearestFreeSlot(slots, pct, taken);
    if (slot < 0) return;
    taken.add(slot);
    slots[slot].release = release;
  });

  return slots;
}

function nearestFreeSlot(slots, pct, taken) {
  let best = -1;
  let bestDistance = Infinity;

  slots.forEach((slot, index) => {
    if (taken.has(index)) return;
    const distance = Math.abs(slot.pct - pct);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });

  return best;
}
