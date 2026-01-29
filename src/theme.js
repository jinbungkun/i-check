// 1. 기초 설정값 (변수로 먼저 분리하여 참조 에러 방지)
const colors = {
  background: '#0a0a0a',
  card: '#1a1a1a',
  inputBg: '#0a0a0a',
  text: '#ffffff',
  subText: '#888888',
  point: '#00d4ff', // 아이체크 포인트 컬러
  border: '#333333',
  success: '#00ff88',
};

const radius = {
  large: '40px',
  medium: '30px',
  small: '15px',
};

const shadow = '0 10px 30px rgba(0,0,0,0.5)';

// 2. 메인 테마 객체
export const theme = {
  colors,
  radius,
  shadow,

  // App 레이아웃
  app: {
    container: {
      minHeight: '100vh',
      fontFamily: "'Pretendard', sans-serif",
      backgroundColor: colors.background,
      color: colors.text,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      boxSizing: 'border-box'
    },
    header: {
      backgroundColor: colors.card,
      borderRadius: radius.medium,
      padding: '10px 30px',
      marginBottom: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    logo: {
      fontSize: '18px',
      fontWeight: '700',
      margin: '15px 0',
      color: colors.point
    },
    nav: {
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      listStyle: 'none',
      padding: '0 0 10px 0',
      margin: 0
    },
    navItem: {
      padding: '10px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      borderRadius: '25px',
      color: '#aaaaaa',
      transition: 'all 0.3s ease'
    },
    activeNavItem: {
      backgroundColor: '#ffffff',
      color: '#000000',
      transform: 'scale(1.05)'
    },
    main: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.large,
      padding: '20px',
      border: `1px solid ${colors.border}`,
      marginTop: '10px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%',
      boxSizing: 'border-box'
    },
    loadingText: {
      color: colors.subText,
      textAlign: 'center',
      marginTop: '50px',
      fontSize: '16px'
    }
  },

  // 출석 페이지
  attendance: {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 0',
      width: '100%',
    },
    statusBox: {
      backgroundColor: '#000',
      padding: '30px 50px',
      borderRadius: radius.medium,
      border: `1px solid ${colors.border}`,
      marginBottom: '20px',
      minWidth: '300px',
      textAlign: 'center'
    },
    statusText: { fontSize: '24px', color: colors.text, margin: 0 },
    resultCard: {
      backgroundColor: colors.card,
      padding: '25px',
      borderRadius: radius.medium,
      border: `1px solid ${colors.point}`,
      width: '100%',
      maxWidth: '400px'
    },
    info: {
      display: 'flex',
      justifyContent: 'space-between',
      margin: '10px 0',
      fontSize: '16px',
      color: '#ccc'
    }
  },

  // 스케쥴/달력 페이지
  calendar: {
    container: {
      display: 'flex',
      gap: '20px',
      marginTop: '20px',
      width: '100%'
    },
    infoPanel: {
      flex: 1,
      backgroundColor: '#000',
      padding: '20px',
      borderRadius: radius.medium,
      border: `1px solid ${colors.border}`,
    },
    calendarPanel: {
      flex: 1.5,
    },
    customStyles: `
      .react-calendar {
        background-color: ${colors.card} !important;
        color: white !important;
        border: 1px solid ${colors.border} !important;
        border-radius: 15px;
        width: 100% !important;
        font-family: 'Pretendard', sans-serif;
      }
      .react-calendar__tile--now {
        background: #333 !important;
        color: ${colors.point} !important;
      }
      .react-calendar__tile:enabled:hover,
      .react-calendar__tile:enabled:focus {
        background-color: #444 !important;
      }
      .react-calendar__navigation button:enabled:hover,
      .react-calendar__navigation button:enabled:focus {
        background-color: #333 !important;
      }
      .dot {
        color: ${colors.success};
        font-size: 10px;
        margin-top: 5px;
        display: block;
      }
    `
  }
};

// 3. 자주 쓰는 공통 스타일 조합
export const commonStyles = {
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: '40px',
    border: `1px solid ${colors.border}`,
    boxShadow: shadow,
    width: '100%',
    maxWidth: '500px',
  },
  input: {
    width: '100%',
    padding: '15px',
    borderRadius: radius.small,
    border: `1px solid #444`,
    backgroundColor: colors.inputBg,
    color: colors.text,
    outline: 'none',
    boxSizing: 'border-box',
    fontSize: '16px',
    textAlign: 'center',
  },
  button: {
    padding: '15px 30px',
    borderRadius: radius.small,
    border: 'none',
    backgroundColor: colors.point,
    color: '#000',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  }
};