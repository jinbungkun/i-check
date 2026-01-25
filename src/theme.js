// src/theme.js
export const theme = {
  colors: {
    background: '#0a0a0a',
    card: '#1a1a1a',
    inputBg: '#0a0a0a',
    text: '#ffffff',
    subText: '#888888',
    point: '#00d4ff', // 아이체크 포인트 컬러
    border: '#333333',
    success: '#00ff88',
  },
  radius: {
    large: '40px',   // 메인 컨테이너용
    medium: '30px',  // 카드/헤더용
    small: '15px',   // 버튼/인풋용
  },
  shadow: '0 10px 30px rgba(0,0,0,0.5)',
};

// 자주 쓰는 공통 스타일 조합
export const commonStyles = {
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.medium,
    padding: '40px',
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadow,
    width: '100%',
    maxWidth: '500px',
  },
  input: {
    width: '100%',
    padding: '15px',
    borderRadius: theme.radius.small,
    border: `1px solid #444`,
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.text,
    outline: 'none',
    boxSizing: 'border-box',
  }
};