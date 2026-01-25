import React, { useState, useEffect } from 'react';
// 컴포넌트 불러오기
import Attendance from './components/Attendance';
import Search from './components/Search';
import Schedule from './components/Schedule';
import Points from './components/Points';
import CardChange from './components/CardChange';
import Register from './components/Register';
import Setting from './components/Setting';

// API 및 초기화 함수 불러오기
import { initializeAppData } from './api';
import { theme } from './theme';

const styles = {
  container: { minHeight: '100vh', fontFamily: "'Pretendard', sans-serif", backgroundColor: '#0a0a0a', color: '#ffffff', display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box' },
  header: { backgroundColor: '#1a1a1a', borderRadius: '30px', padding: '10px 30px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logo: { fontSize: '18px', fontWeight: '700', margin: '15px 0', color: '#00d4ff' },
  nav: { display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', listStyle: 'none', padding: '0 0 10px 0', margin: 0 },
  navItem: { padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', borderRadius: '25px', color: '#aaaaaa', transition: 'all 0.3s ease' },
  activeNavItem: { backgroundColor: '#ffffff', color: '#000000', transform: 'scale(1.05)' },
  main: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: '40px', padding: '20px', border: '1px solid #333', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box' },
  loadingText: { color: '#888', textAlign: 'center', marginTop: '50px', fontSize: '16px' }
};

function App() {
  const [activeTab, setActiveTab] = useState('출석');
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 데이터 로딩 상태 관리

  // 1. 앱 시작 시 데이터 초기화 실행
  useEffect(() => {
    const init = async () => {
      try {
        console.log("I-Check 시스템 초기화 중...");
        await initializeAppData(); // api.js에서 만든 초기화 함수 호출
      } catch (error) {
        console.error("데이터 초기화 실패:", error);
      } finally {
        setIsDataLoaded(true); // 성공하든 실패하든 로딩 상태는 종료
      }
    };
    init();
  }, []);

  const categories = ['출석', '조회', '스케쥴', '포인트', '카드교체', '등록', '설정'];

  // 2. 선택된 탭에 따라 다른 컴포넌트를 보여주는 함수
  const renderComponent = () => {
    // 설정 탭은 데이터 로딩과 상관없이 항상 접근 가능해야 함 (URL 수정을 위해)
    if (!isDataLoaded && activeTab !== '설정') {
      return <div style={styles.loadingText}>학생 정보를 동기화하고 있습니다...</div>;
    }

    switch (activeTab) {
      case '출석': return <Attendance />;
      case '조회': return <Search />;
      case '스케쥴': return <Schedule />;
      case '포인트': return <Points />;
      case '카드교체': return <CardChange />;
      case '등록': return <Register />;
      case '설정': return <Setting />;
      default: return <div>선택된 메뉴가 없습니다.</div>;
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>I-Check(아이 체크)</div>
        <nav>
          <ul style={styles.nav}>
            {categories.map((item) => (
              <li
                key={item}
                style={{
                  ...styles.navItem,
                  ...(activeTab === item ? styles.activeNavItem : {})
                }}
                onClick={() => setActiveTab(item)}
              >
                {item}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main style={styles.main}>
        {renderComponent()}
      </main>
    </div>
  );
}

export default App;