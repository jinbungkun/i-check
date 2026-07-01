import React from 'react';

const STATUS_STYLES = {
  success: {
    backgroundColor: '#1e293b',
    color: '#3b82f6',
    borderColor: '#3b82f6'
  },
  error: {
    backgroundColor: '#442727',
    color: '#ff4d4f',
    borderColor: '#ff4d4f'
  },
  info: {
    backgroundColor: '#2d303a',
    color: '#94a3b8',
    borderColor: '#3d414d'
  },
  loading: {
    backgroundColor: '#172554',
    color: '#60a5fa',
    borderColor: '#60a5fa'
  }
};

export default function StatusBanner({ type = 'info', message = '', style = {}, children }) {
  if (!message && !children) return null;

  const tone = STATUS_STYLES[type] || STATUS_STYLES.info;

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        border: `1px solid ${tone.borderColor}`,
        backgroundColor: tone.backgroundColor,
        color: tone.color,
        fontSize: '14px',
        fontWeight: '600',
        lineHeight: 1.4,
        ...style
      }}
    >
      {message || children}
    </div>
  );
}
