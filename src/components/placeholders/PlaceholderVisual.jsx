export function PlaceholderVisual({ name }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0c002e 0%, #16073d 60%, #1a0a50 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '1.75rem 1.75rem',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-3rem',
          right: '-3rem',
          width: '12rem',
          height: '12rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,36,215,0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      <span
        style={{
          fontFamily: 'Neuemontreal, sans-serif',
          fontSize: '5rem',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.1)',
          letterSpacing: '0.05em',
          position: 'relative',
          zIndex: 1,
          userSelect: 'none',
        }}
      >
        {initials}
      </span>
    </div>
  );
}
