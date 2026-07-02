import React, { useState, useEffect, useCallback, useMemo } from 'react';
// 컴포넌트 임포트
import Ranking from './components/Ranking';
import Attendance from './components/Attendance';
import Search from './components/Search';
import Schedule from './components/Schedule';
import Points from './components/Points';
import Register from './components/Register';
import Setting from './components/Setting';
import Birthday from './components/Birthday';
import Report from './components/Report';
import StaffStatusBoard from './components/StaffStatusBoard';
// 유틸리티 및 테마
import { requestGAS } from './utils/GoogleAppScript';
import { filterEssentialData } from './utils/DataHelper';
import { subscribeTestKey } from './utils/InputManager';
import LoadingState from './components/common/LoadingState';

/**
 * 💡 하얀 테두리 박멸 및 글로벌 스타일 주입
 * 브라우저 기본 마진을 0으로 만들고 가로 스크롤을 방지합니다.
 */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      margin: 0 !important; 
      padding: 0 !important; 
      background-color: #1a1c23; 
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    /* 스크롤바 숨기기 (선택사항) */
    ::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(style);
}

function App() {
  const [activeMenu, setActiveMenu] = useState('출석'); 
  const [isSyncing, setIsSyncing] = useState(true);     
  const [studentList, setStudentList] = useState([]); 
  const [headers, setHeaders] = useState([]); 
  
  // 📱 반응형 상태: 화면 폭 768px 미만일 때 모바일 모드
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 출석모드 상태 추가
  const [isAttendanceMode, setIsAttendanceMode] = useState(() => {
    return localStorage.getItem('attendance_mode') === 'true';
  });

  const menuCategories = ['출석','생일','조회', '스케쥴', '포인트', '등록', '랭킹', '성적표', '인원현황', '설정'];

  // 📦 메모이제이션: sharedProps 객체 캐시
  const sharedProps = useMemo(() => ({ 
    students: studentList, 
    setStudents: setStudentList,
    headers: headers 
  }), [studentList, headers]);

  // 📦 메모이제이션: 메뉴 맵 캐시
  const menuMap = useMemo(() => ({
    '출석': <Attendance {...sharedProps} />,
    '생일': <Birthday {...sharedProps} />,
    '조회': <Search {...sharedProps} />,
    '스케쥴': <Schedule {...sharedProps} />,
    '포인트': <Points {...sharedProps} />,
    '랭킹': <Ranking />,
    '등록': <Register {...sharedProps} />,
    '성적표': <Report {...sharedProps} />,
        '인원현황': <StaffStatusBoard {...sharedProps} />,
        '설정': <Setting 
      isAttendanceMode={isAttendanceMode} 
      setIsAttendanceMode={setIsAttendanceMode} 
    />
  }), [sharedProps, isAttendanceMode]);

  // 화면 크기 실시간 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * 🔄 서버 데이터 동기화
   */
  const syncStudentData = useCallback(async (forceRefresh = false) => {
    console.log(forceRefresh ? "🔄 강제 데이터 새로고침..." : "🔄 서버 데이터 동기화 시도...");
    setIsSyncing(true);
    try {
      const [studentRes, headerRes] = await Promise.all([
        requestGAS({ action: 'getStudents' }),
        requestGAS({ action: 'getHeaders' })
      ]);
      
      if (studentRes?.ok) {
        const refinedData = filterEssentialData(studentRes.data);
        setStudentList(refinedData);
      }

      if (Array.isArray(headerRes?.data)) {
        setHeaders(headerRes.data);
      } else if (Array.isArray(headerRes)) {
        setHeaders(headerRes);
      } else if (headerRes?.data) {
        setHeaders(headerRes.data);
      }
      console.log("✅ 동기화 완료");
    } catch (error) {
      console.error("❌ 동기화 에러:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    syncStudentData(); 
    const unsubscribe = subscribeTestKey();
    return () => unsubscribe();
  }, [syncStudentData]);

  /**
   * 🖼️ 메인 컨텐츠 렌더링 함수
   */
  const renderContent = () => {
    if (isSyncing && activeMenu !== '설정') {
      return <LoadingState message="데이터를 동기화하고 있습니다..." />;
    }

    // 출석모드일 때는 출석 또는 설정 컴포넌트 표시
    if (isAttendanceMode) {
      if (activeMenu === '설정') {
        return <Setting 
          isAttendanceMode={isAttendanceMode} 
          setIsAttendanceMode={setIsAttendanceMode} 
        />;
      }
      return <Attendance {...sharedProps} />;
    }

    return menuMap[activeMenu] || <div>선택된 메뉴가 없습니다.</div>;
  };

  return (
    <div style={responsiveContainerStyle}>
      {/* 📱 반응형 헤더 섹션 */}
      <header style={responsiveHeaderStyle(isMobile)}>
        <div style={headerTopStyle}>
          <div style={logoStyle} onClick={() => window.location.reload()}>
            I-Check
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={statusBadgeStyle(isSyncing)}>
              {isSyncing ? '● 동기화중' : '● 연결됨'}
            </div>
            <button
              onClick={() => syncStudentData(true)}
              disabled={isSyncing}
              style={{
                ...refreshButtonStyle(isMobile),
                opacity: isSyncing ? 0.6 : 1,
                cursor: isSyncing ? 'not-allowed' : 'pointer'
              }}
              title="엑셀 데이터 최신화"
            >
              🔄 {isSyncing ? '동기화중...' : '데이터 업데이트'}
            </button>
          </div>
        </div>

        <nav style={navWrapperStyle(isMobile)}>
          <ul style={navStyle(isMobile)}>
            {/* 출석모드일 때는 출석과 설정 메뉴 표시 */}
            {isAttendanceMode ? (
              ['출석', '설정'].map((menu) => (
                <li
                  key={menu}
                  style={{
                    ...navItemStyle(isMobile),
                    ...(activeMenu === menu ? activeNavItemStyle : {})
                  }}
                  onClick={() => setActiveMenu(menu)}
                >
                  {menu}
                </li>
              ))
            ) : (
              /* 일반모드일 때는 모든 메뉴 표시 */
              menuCategories.map((menu) => (
                <li
                  key={menu}
                  style={{
                    ...navItemStyle(isMobile),
                    ...(activeMenu === menu ? activeNavItemStyle : {})
                  }}
                  onClick={() => setActiveMenu(menu)}
                >
                  {menu}
                </li>
              ))
            )}
          </ul>
        </nav>
      </header>

      {/* 메인 영역 */}
      <main style={mainContentStyle(isMobile)}>
        {renderContent()}
      </main>
    </div>
  );
}

/** 🎨 CSS-in-JS 스타일 정의 **/

const responsiveContainerStyle = {
  minHeight: '100vh',
  width: '100%',
  backgroundColor: '#1a1c23',
  display: 'flex',
  flexDirection: 'column',
};

const responsiveHeaderStyle = (isMobile) => ({
  backgroundColor: '#24262d',
  padding: isMobile ? '15px 15px 0 15px' : '0 25px',
  borderBottom: '1px solid #333',
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  alignItems: isMobile ? 'stretch' : 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
});

const headerTopStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '5px',
};

const logoStyle = {
  fontSize: '22px',
  fontWeight: '900',
  color: '#3b82f6',
  cursor: 'pointer',
  letterSpacing: '-0.5px',
  padding: '10px 0',
  marginRight: '20px'
};

const refreshButtonStyle = (isMobile) => ({
  padding: isMobile ? '6px 12px' : '8px 16px',
  fontSize: isMobile ? '12px' : '13px',
  fontWeight: '600',
  color: '#fff',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: '#2563eb',
    transform: 'translateY(-1px)'
  },
  '&:active': {
    transform: 'translateY(0px)'
  }
});

const navWrapperStyle = (isMobile) => ({
  overflowX: isMobile ? 'auto' : 'visible',
  WebkitOverflowScrolling: 'touch',
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
});

const navStyle = (isMobile) => ({
  display: 'flex',
  listStyle: 'none',
  padding: 0,
  margin: 0,
  gap: isMobile ? '18px' : '30px',
});

const navItemStyle = (isMobile) => ({
  padding: isMobile ? '12px 2px' : '22px 0',
  color: '#94a3b8',
  fontSize: isMobile ? '14px' : '15px',
  fontWeight: '700',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  borderBottom: '3px solid transparent',
  transition: 'all 0.2s ease',
});

const activeNavItemStyle = {
  color: '#fff',
  borderBottom: '3px solid #3b82f6',
};

const statusBadgeStyle = (isSyncing) => ({
  fontSize: '11px',
  fontWeight: 'bold',
  padding: '4px 10px',
  borderRadius: '20px',
  backgroundColor: isSyncing ? '#3b82f615' : '#10b98115',
  color: isSyncing ? '#3b82f6' : '#10b981',
  border: `1px solid ${isSyncing ? '#3b82f633' : '#10b98133'}`
});

const mainContentStyle = (isMobile) => ({
  flex: 1,
  padding: isMobile ? '15px' : '30px',
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  boxSizing: 'border-box'
});

const loadingContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '60vh',
};

const spinnerStyle = {
  width: '32px',
  height: '32px',
  border: '3px solid rgba(59, 130, 246, 0.1)',
  borderTop: '3px solid #3b82f6',
  borderRadius: '50%',
};

export default App;