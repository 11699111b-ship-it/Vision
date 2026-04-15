import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressRing({ percentage = 0, size = 200, strokeWidth = 10 }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div data-testid="progress-ring" style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#39FF14"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>

      {/* Percentage centered */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.p
          key={percentage}
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            fontWeight: 900,
            fontSize: size * 0.22,
            color: '#ffffff',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {percentage}%
        </motion.p>
      </div>
    </div>
  );
}
