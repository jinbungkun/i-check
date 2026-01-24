import React, { useState } from 'react';

const styles = {
  container: {
    minHeight: '100vh',
    fontFamily: "'Pretendard', sans-serif",
    backgroundColor: '#0a0a0a', // 깊은 검은색
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxSizing: 'border-box'
  },
  header: {
    backgroundColor: '#1a1a1a',
    borderRadius: '30px', // 전체적으로 둥글게
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
    color: '#00d4ff', // 포인트 컬러 (네온 블루)
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    listStyle: 'none',
    padding: '0 0 10px 0',
    margin: 0,
  },
  navItem: {
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '25px', // 메뉴 버튼도 둥글게
    color: '#aaaaaa',
    transition: 'all 0.3s ease',
  },
  activeNavItem: {
    backgroundColor: '#ffffff', // 활성 메뉴는 흰색 배경
    color: '#000000', // 글자는 검은색으로 반전
    transform: 'scale(1.05)',
  },
  main: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: '40px', // 메인 콘텐츠 영역도 크게 둥글게
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #333',
    marginTop: '10px'
  },
  statusBadge: {
    backgroundColor: '#333',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#00d4ff',
    marginBottom: '20px'
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('출석');
  const categories = ['출석', '조회', '스케쥴', '포인트', '카드교체', '등록', '설정'];

  return (
    <div style={styles.container}>
      {/* 둥근 상단 캡슐형 헤더 */}
      <header style={styles.header}>
        <div style={styles.logo}>✨ ACADEMY MANAGER</div>
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

      {/* 메인 콘텐츠 영역 */}
      <main style={styles.main}>
        <div style={styles.statusBadge}>System Online</div>
        <h2 style={{ fontSize: '32px', fontWeight: '300' }}>
          <span style={{ fontWeight: '800', color: '#00d4ff' }}>{activeTab}</span> 모드
        </h2>
        <p style={{ color: '#666', marginTop: '10px' }}>데이터를 불러올 준비가 되었습니다.</p>
        
        {/* 나중에 데이터가 들어올 자리 (예시 박스) */}
        <div style={{ 
          marginTop: '40px', 
          width: '80%', 
          height: '100px', 
          border: '2px dashed #333', 
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#444'
        }}>
          여기에 구글 시트 리스트가 표시됩니다
        </div>
      </main>
    </div>
  );
}

export default App;