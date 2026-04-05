import React, { useState, useEffect, useMemo } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { filterEssentialData } from '../utils/DataHelper';

function Ranking() {
  const [students, setStudents] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('30초모아');

  // 1. 컴포넌트가 열릴 때만 데이터 가져오기
  useEffect(() => {
    const fetchRankingData = async () => {
      setIsDataLoading(true);
      try {
        const res = await requestGAS({ action: 'getStudents' });
        if (res.status === "success") {
          // DataHelper를 사용해 랭킹용 컬럼(30초모아 등)이 포함된 데이터 정제
          const refined = filterEssentialData(res.data);
          setStudents(refined);
        }
      } catch (e) {
        console.error("랭킹 데이터 로드 실패:", e);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchRankingData();
  }, []); // 빈 배열: 딱 한 번(메뉴 클릭 시)만 실행

  // 2. 학년군 필터 설정 (이전과 동일)
  const groups = [
    { label: '유치부', filter: (s) => parseInt(s.생년월일?.split('-')[0]) >= 2020 },
    { label: '1~2학년', filter: (s) => {
        const y = parseInt(s.생년월일?.split('-')[0]);
        return y >= 2018 && y <= 2019;
      }
    },
    { label: '3~4학년', filter: (s) => {
        const y = parseInt(s.생년월일?.split('-')[0]);
        return y >= 2016 && y <= 2017;
      }
    },
    { label: '5~6학년', filter: (s) => {
        const y = parseInt(s.생년월일?.split('-')[0]);
        return y >= 2014 && y <= 2015;
      }
    },
    { label: '중고등성인', filter: (s) => parseInt(s.생년월일?.split('-')[0]) <= 2013 },
  ];

  // 3. 실시간 랭킹 계산
  const rankingData = useMemo(() => {
    return groups.map(group => {
      const filtered = students
        .filter(group.filter)
        .filter(s => Number(s[selectedCategory]) > 0)
        .sort((a, b) => Number(b[selectedCategory]) - Number(a[selectedCategory]))
        .slice(0, 3);
      return { ...group, top3: filtered };
    });
  }, [students, selectedCategory]);

  if (isDataLoading) {
    return <div style={loadingStyle}>🏆 최신 랭킹을 집계 중입니다...</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{margin:0}}>🏆 실시간 랭킹</h2>
        <div style={tabBox}>
          {['30초모아', '30초번갈아', '30초이중뛰기'].map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...tabBtn,
                backgroundColor: selectedCategory === cat ? '#3b82f6' : '#2d303a',
                border: selectedCategory === cat ? '1px solid #3b82f6' : '1px solid #444'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={gridStyle}>
        {rankingData.map(group => (
          <div key={group.label} style={cardStyle}>
            <div style={groupTitle}>{group.label}</div>
            <div style={listStyle}>
              {group.top3.length > 0 ? group.top3.map((s, i) => (
                <div key={s.ID} style={itemStyle}>
                  <span style={rankStyle(i)}>{i+1}위</span>
                  <span style={{flex:1}}>{s.이름}</span>
                  <span style={scoreStyle}>{s[selectedCategory]}회</span>
                </div>
              )) : <div style={noneStyle}>기록 없음</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- CSS 스타일 (요약) ---
const containerStyle = { padding: '10px', color: '#fff' };
const headerStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', flexWrap:'wrap', gap:'15px' };
const tabBox = { display:'flex', gap:'8px' };
const tabBtn = { padding:'8px 15px', borderRadius:'8px', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'bold' };
const gridStyle = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' };
const cardStyle = { backgroundColor:'#24262d', borderRadius:'15px', border:'1px solid #333', overflow:'hidden' };
const groupTitle = { backgroundColor:'#2d303a', padding:'12px', textAlign:'center', fontSize:'14px', fontWeight:'bold', color:'#3b82f6' };
const listStyle = { padding:'15px' };
const itemStyle = { display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #333' };
const rankStyle = (i) => ({ width:'40px', color: i===0?'#f59e0b':i===1?'#94a3b8':'#b45309', fontWeight:'900' });
const scoreStyle = { color:'#3b82f6', fontWeight:'bold' };
const noneStyle = { textAlign:'center', color:'#555', padding:'20px' };
const loadingStyle = { display:'flex', justifyContent:'center', alignItems:'center', height:'50vh', color:'#94a3b8' };

export default Ranking;