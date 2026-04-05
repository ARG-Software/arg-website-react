import React from 'react';
import { CounterWidget } from '../widgets/CounterWidget';

export function StatsGrid({ stats = [], className = '' }) {
  return (
    <div className={`cp-hero-stats ${className}`}>
      {stats.map((stat, i) => (
        <CounterWidget key={i} value={stat.value} label={stat.label} variant="compact" />
      ))}
    </div>
  );
}
