export function AmbientVideoBackground({ src, className = '' }) {
  return (
    <div
      className={['ambient-video-background', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <video autoPlay loop muted playsInline>
        <source src={src} type="video/mp4" />
      </video>
      <div className="ambient-video-background__overlay" />
    </div>
  );
}
