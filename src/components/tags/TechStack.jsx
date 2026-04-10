import React from 'react';

export function TechStack({ stack, label = 'Tech Stack:', className = '' }) {
  const technologies = Array.isArray(stack) ? stack : stack.split(', ').map(t => t.trim());

  return (
    <div className={`prp-stack-area pp-animate ${className}`}>
      <span className="prp-stack-label">{label}</span>
      {technologies.map((tech, i) => (
        <span key={i} className="prp-stack-tag">
          {tech}
        </span>
      ))}
    </div>
  );
}
