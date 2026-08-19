export function ArgMarkIcon({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 313 298" fill="none" className={className}>
      <defs>
        <linearGradient
          id="arg-mark-gradient"
          x1="0"
          y1="22"
          x2="313"
          y2="298"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#EC0923" />
          <stop offset="25%" stopColor="#E21157" />
          <stop offset="50%" stopColor="#D01FB3" />
          <stop offset="75%" stopColor="#A015E5" />
          <stop offset="100%" stopColor="#8306FF" />
        </linearGradient>
      </defs>
      <rect x="112" y="22" width="202" height="70" fill="url(#arg-mark-gradient)" />
      <rect x="0" y="93" width="134" height="68" fill="url(#arg-mark-gradient)" />
      <rect x="49" y="162" width="199" height="69" fill="url(#arg-mark-gradient)" />
      <rect x="247" y="233" width="67" height="66" fill="url(#arg-mark-gradient)" />
    </svg>
  );
}
