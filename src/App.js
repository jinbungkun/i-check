import React, { useState, useEffect, useCallback } from 'react';
// 컴포넌트 임포트
import Attendance from './components/Attendance';
import Search from './components/Search';
import Schedule from './components/Schedule';
import Points from './components/Points';
import Register from './components/Register';
import Setting from './components/Setting';

// 유틸리티 및 테마
import { requestGAS } from './utils/GoogleAppScript';
import { filterEssentialData } from './utils/DataHelper'; 
import { theme } from './theme';
import { subscribeTestKey } from './utils/InputManager';

function App() {
  const [activeMenu, setActiveMenu] = useState('출석'); 
  const [isSyncing, setIsSyncing] = useState(true);     
  const [studentList, setStudentList] = useState([]); 
  // 💡 추가: 모든 컴포넌트에서 공유할 시트 헤더 상태
  const [headers, setHeaders] = useState([]); 
  
  const { app: styles } = theme;
  const menuCategories = ['출석', '조회', '스케쥴', '포인트', '등록', '설정'];

  /**
   * 🔄 서버와 데이터(학생 명단 + 시트 헤더) 동기화
   */
  const syncStudentData = useCallback(async () => {
    console.log("🔄 서버 데이터 동기화 시도 (명단 & 헤더)...");
    setIsSyncing(true);

    try {
      // 💡 최적화: 두 요청을 동시에 보내서 대기 시간을 절반으로 줄임
      const [studentRes, headerRes] = await Promise.all([
        requestGAS({ action: 'getStudents' }),
        requestGAS({ action: 'getHeaders' })
      ]);
      
      // 1. 학생 명단 처리
      if (studentRes.status === "success") {
        const refinedData = filterEssentialData(studentRes.data);
        setStudentList(refinedData);
      }

      // 2. 헤더 정보 처리 (배열 형태 예상)
      if (Array.isArray(headerRes)) {
        setHeaders(headerRes);
        console.log("✅ 헤더 동기화 성공:", headerRes.length, "개 항목");
      } else if (headerRes && headerRes.data) {
        setHeaders(headerRes.data);
      }

      console.log("✅ 전체 데이터 동기화 완료");
    } catch (error) {
      console.error("❌ 데이터 동기화 에러:", error);
      alert("서버 연결이 원활하지 않습니다. 인터넷 연결이나 GAS 배포 상태를 확인해주세요.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * ⌨️ 초기 실행 및 단축키 설정
   */
  useEffect(() => {
    syncStudentData(); 
    const unsubscribe = subscribeTestKey();
    return () => unsubscribe();
  }, [syncStudentData]);

  /**
   * 🖼️ 메뉴에 따른 컨텐츠 렌더링
   */
  const renderContent = () => {
    // 동기화 중일 때 로딩 화면 (설정 메뉴는 즉시 진입 허용)
    if (isSyncing && activeMenu !== '설정') {
      return (
        <div style={styles.loadingContainer}>
          <div className="spinner"></div>
          <p style={styles.loadingText}>최신 정보를 서버와 동기화 중입니다...</p>
        </div>
      );
    }

    // 자식 컴포넌트들과 공유할 속성들
    const sharedProps = { 
      students: studentList, 
      setStudents: setStudentList,
      headers: headers // 💡 모든 자식에게 헤더 정보 공유 (필요한 곳에서 사용)
    };

    const menuMap = {
      '출석': <Attendance {...sharedProps} />,
      '조회': <Search {...sharedProps} />,
      '스케쥴': <Schedule {...sharedProps} />,
      '포인트': <Points {...sharedProps} />,
      // 💡 등록 페이지에서 headers를 사용하여 동적 UI 생성
      '등록': <Register {...sharedProps} />, 
      '설정': <Setting />
    };

    return menuMap[activeMenu] || <div>선택된 메뉴가 없습니다.</div>;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => window.location.reload()} title="새로고침">
          I-Check
        </div>
        <nav>
          <ul style={styles.nav}>
            {menuCategories.map((menu) => (
              <li
                key={menu}
                style={{
                  ...styles.navItem,
                  ...(activeMenu === menu ? styles.activeNavItem : {})
                }}
                onClick={() => setActiveMenu(menu)}
              >
                {menu}
              </li>
            ))}
          </ul>
        </nav>
        {/* 우측 상단 동기화 상태 표시 (선택사항) */}
        <div style={{fontSize: '12px', color: isSyncing ? '#3b82f6' : '#10b981'}}>
          {isSyncing ? '● 동기화중' : '● 연결됨'}
        </div>
      </header>

      <main style={styles.main}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;