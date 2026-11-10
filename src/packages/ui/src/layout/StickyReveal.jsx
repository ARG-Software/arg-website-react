import { cloneElement, useEffect, useRef, useState } from 'react';

// The page scrolls off the child, which waits underneath (see .sticky-reveal in styles.css)
export function StickyReveal({ children, className = '', id }) {
  const childRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const child = childRef.current;
    if (!child) return undefined;
    const resize = new ResizeObserver(() => setHeight(child.offsetHeight));
    resize.observe(child);
    return () => resize.disconnect();
  }, []);

  return (
    <div
      id={id}
      className={`sticky-reveal${height ? ' is-revealing' : ''}${className ? ` ${className}` : ''}`}
      style={height ? { '--sticky-reveal-height': `${height}px` } : undefined}
    >
      <div className="sticky-reveal__track">{cloneElement(children, { ref: childRef })}</div>
    </div>
  );
}
