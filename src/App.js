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
  const [activeMenu, setActiveMenu] = useState('출석'); // Tab 대신 Menu라는 명칭 사용
  const [isSyncing, setIsSyncing] = useState(true);    // 로딩 여부보다 '동기화 중'임을 명시
  const [studentList, setStudentList] = useState([]); // 명확하게 '학생 명단'임을 표시
  
  const { app: styles } = theme;
  const menuCategories = ['출석', '조회', '스케쥴', '포인트', '카드교체', '등록', '설정'];

  /**
   * 🔄 서버와 학생 명단 동기화
   */
  const syncStudentData = useCallback(async () => {
    console.log("🔄 서버 데이터 동기화 시도...");
    setIsSyncing(true);

    try {
      const response = await requestGAS({ action: 'getStudents' });
      
      if (response.status === "success") {
        const refinedData = filterEssentialData(response.data);
        setStudentList(refinedData);
        console.log("✅ 동기화 성공:", refinedData.length, "명");
      }
    } catch (error) {
      console.error("❌ 데이터 동기화 에러:", error);
      alert("서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * ⌨️ 테스트용 단축키 설정 (F1)
   */
  useEffect(() => {
    syncStudentData(); // 앱 시작 시 동기화 실행
    const unsubscribe = subscribeTestKey();
    return () => unsubscribe();
  }, [syncStudentData]);

  /**
   * 🖼️ 현재 선택된 메뉴의 컴포넌트 렌더링
   */
  const renderContent = () => {
    // 동기화 중일 때 화면 보호 (설정 메뉴 제외)
    if (isSyncing && activeMenu !== '설정') {
      return <div style={styles.loadingText}>최신 학생 정보를 가져오는 중입니다...</div>;
    }

    // 모든 자식 컴포넌트가 공유할 데이터와 제어 함수
    const sharedProps = { 
      students: studentList, 
      setStudents: setStudentList 
    };

    const menuMap = {
      '출석': <Attendance {...sharedProps} />,
      '조회': <Search {...sharedProps} />,
      '스케쥴': <Schedule {...sharedProps} />,
      '포인트': <Points {...sharedProps} />,
      '등록': <Register {...sharedProps} />,
      '설정': <Setting />
    };

    return menuMap[activeMenu] || <div>선택된 메뉴가 없습니다.</div>;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>I-Check</div>
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
      </header>

      <main style={styles.main}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;