import React, { useState, useMemo } from 'react';

const Ranking = ({ students }) => {
  const [selectedCategory, setSelectedCategory] = useState('30초모아'); // 기본 카테고리

  // 1. 학년군 정의
  const groups = [
    { label: '유치부', filter: (s) => new Date(s.생년월일).getFullYear() >= 2020 },
    { label: '1~2학년', filter: (s) => {
        const year = new Date(s.생년월일).getFullYear();
        return year >= 2018 && year <= 2019;
      }
    },
    { label: '3~4학년', filter: (s) => {
        const year = new Date(s.생년월일).getFullYear();
        return year >= 2016 && year <= 2017;
      }
    },
    { label: '5~6학년', filter: (s) => {
        const year = new Date(s.생년월일).getFullYear();
        return year >= 2014 && year <= 2015;
      }
    },
    { label: '중고등성인', filter: (s) => new Date(s.생년월일).getFullYear() <= 2013 },
  ];

  // 2. 랭킹 데이터 계산 (useMemo로 성능 최적화)
  const rankingData = useMemo(() => {
    return groups.map(group => {
      const filtered = students
        .filter(group.filter)
        .filter(s => s[selectedCategory] > 0) // 0점 제외
        .sort((a, b) => b[selectedCategory] - a[selectedCategory]) // 내림차순 정렬
        .slice(0, 3); // 상위 3명

      return { ...group, top3: filtered };
    });
  }, [students, selectedCategory]);

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>🏆 왕중왕전 랭킹</h2>
      
      {/* 카테고리 선택 버튼 */}
      <div style={tabWrapperStyle}>
        {['30초모아', '30초번갈아', '30초이중뛰기'].map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              ...tabButtonStyle,
              backgroundColor: selectedCategory === cat ? '#3b82f6' : '#2d3748',
              color: selectedCategory === cat ? '#fff' : '#94a3b8'
            }}
          >
            {cat.replace('30초', '30초 ')}
          </button>
        ))}
      </div>

      {/* 랭킹 보드 그리드 */}
      <div style={gridStyle}>
        {rankingData.map((group) => (
          <div key={group.label} style={cardStyle}>
            <div style={groupHeaderStyle}>{group.label}</div>
            <div style={listStyle}>
              {group.top3.length > 0 ? (
                group.top3.map((student, index) => (
                  <div key={student.ID} style={itemStyle(index)}>
                    <span style={rankBadgeStyle(index)}>{index + 1}위</span>
                    <span style={nameStyle}>{student.이름}</span>
                    <span style={scoreStyle}>{student[selectedCategory]}회</span>
                  </div>
                ))
              ) : (
                <div style={emptyStyle}>기록된 데이터가 없습니다.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 🎨 스타일 정의 */
const containerStyle = { color: '#fff' };
const titleStyle = { fontSize: '24px', marginBottom: '20px', fontWeight: '800' };

const tabWrapperStyle = { display: 'flex', gap: '10px', marginBottom: '25px' };
const tabButtonStyle = { 
  padding: '10px 20px', border: 'none', borderRadius: '8px', 
  cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' 
};

const gridStyle = { 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
  gap: '20px' 
};

const cardStyle = { 
  backgroundColor: '#24262d', borderRadius: '12px', 
  border: '1px solid #333', overflow: 'hidden' 
};

const groupHeaderStyle = { 
  backgroundColor: '#2d3748', padding: '12px', 
  textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#3b82f6' 
};

const listStyle = { padding: '15px' };

const itemStyle = (index) => ({
  display: 'flex', alignItems: 'center', padding: '12px 0',
  borderBottom: index === 2 ? 'none' : '1px solid #333'
});

const rankBadgeStyle = (index) => ({
  width: '40px', fontSize: '12px', fontWeight: 'bold',
  color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32'
});

const nameStyle = { flex: 1, fontWeight: '600', fontSize: '15px' };
const scoreStyle = { fontWeight: '800', color: '#3b82f6' };
const emptyStyle = { textAlign: 'center', color: '#666', padding: '20px', fontSize: '14px' };

export default Ranking;