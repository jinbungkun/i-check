import React from 'react';

export default function LoadingState({ message = '데이터를 불러오는 중입니다...', size = 'medium' }) {
  const sizeMap = {
    small: { spinner: '24px', text: '13px' },
    medium: { spinner: '32px', text: '14px' },
    large: { spinner: '40px', text: '16px' }
  };

  const current = sizeMap[size] || sizeMap.medium;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '220px',
      gap: '12px',
      color: '#94a3b8'
    }}>
      <div style={{
        width: current.spinner,
        height: current.spinner,
        border: '3px solid rgba(59, 130, 246, 0.15)',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: current.text, fontWeight: '600' }}>{message}</span>
    </div>
  );
}
