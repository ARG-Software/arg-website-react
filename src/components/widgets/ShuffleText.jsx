import { useCallback, useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export function ShuffleText({ text, className = '', tag: Tag = 'span', ...props }) {
  const ref = useRef(null);
  const frameRef = useRef(null);
  const isHoveringRef = useRef(false);

  const shuffle = useCallback(() => {
    if (isHoveringRef.current || !ref.current) return;
    isHoveringRef.current = true;

    const original = text;
    const length = original.length;
    let iteration = 0;
    const maxIterations = length * 3;

    const step = () => {
      iteration++;
      const progress = iteration / maxIterations;

      let result = '';
      for (let i = 0; i < length; i++) {
        if (i / length < progress) {
          result += original[i];
        } else {
          result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      if (ref.current) {
        ref.current.textContent = result;
      }

      if (iteration < maxIterations) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        if (ref.current) {
          ref.current.textContent = original;
        }
        isHoveringRef.current = false;
      }
    };

    frameRef.current = requestAnimationFrame(step);
  }, [text]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      onMouseEnter={shuffle}
      style={{ whiteSpace: 'nowrap', display: 'inline-block' }}
      {...props}
    >
      {text}
    </Tag>
  );
}
