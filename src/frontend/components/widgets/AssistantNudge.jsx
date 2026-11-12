import { useEffect, useState } from 'react';
import assistantContent from '@data/assistant.json';
import { isMobile, prefersReducedMotion } from '@utils/helpers';

const TYPING_STEP_MS = 35;

// Gaspar's speech bubble: types its offer next to the trigger; tapping it opens the chat
export function AssistantNudge({ onChat, onClose }) {
  const { message: desktopMessage, mobileMessage, chatLabel, closeLabel } = assistantContent.nudge;
  const [isPhone] = useState(() => typeof window !== 'undefined' && isMobile());
  const message = isPhone ? mobileMessage : desktopMessage;
  const [typedLength, setTypedLength] = useState(() =>
    prefersReducedMotion() ? message.length : 0
  );
  const typingDone = typedLength >= message.length;

  useEffect(() => {
    if (typingDone) return undefined;

    const timer = window.setInterval(() => setTypedLength(length => length + 1), TYPING_STEP_MS);
    return () => window.clearInterval(timer);
  }, [typingDone]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="aw-nudge" role="dialog" aria-label={assistantContent.name}>
      <button className="aw-nudge__bubble" type="button" aria-label={chatLabel} onClick={onChat}>
        <span className="aw-nudge__sr" aria-live="polite">
          {message}
        </span>
        <span className="aw-nudge__message" aria-hidden="true">
          {message.slice(0, typedLength)}
          {!typingDone && <span className="aw-nudge__caret" />}
        </span>
      </button>

      <button className="aw-nudge__close" type="button" aria-label={closeLabel} onClick={onClose}>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  );
}
