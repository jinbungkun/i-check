import React, { useState, useEffect, useMemo } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { filterEssentialData } from '../utils/DataHelper';

function Ranking() {
  const [students, setStudents] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('30초모아');

  // 1. 컴포넌트 마운트 시 데이터 로드 (Report 방식 이식)
  useEffect(() => {
    const fetchRankingData = async () => {
      setIsDataLoading(true);
      try {
        const res = await requestGAS({ action: 'getStudents' });
        if (res.status === "success") {
          // DataHelper를 통해 정제된 데이터 수신
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
  }, []);

  // 💡 [핵심] 연도 추출 함수 및 자동 연도 계산 변수
  const currentYear = new Date().getFullYear();
  
  const getYear = (dateStr) => {
    if (!dateStr) return 0;
    const match = String(dateStr).match(/\d{4}/); 
    return match ? parseInt(match[0]) : 0;
  };

  // 2. [핵심] 학년군 정의 (올해 연도를 기준으로 상대적 계산 -> 자동 승급 반영)
  const groups = useMemo(() => [
    { label: '유치부', filter: (s) => getYear(s.생년월일) >= currentYear - 6 },
    { label: '1~2학년', filter: (s) => { 
        const y = getYear(s.생년월일); 
        return y >= currentYear - 8 && y <= currentYear - 7; 
      } 
    },
    { label: '3~4학년', filter: (s) => { 
        const y = getYear(s.생년월일); 
        return y >= currentYear - 10 && y <= currentYear - 9; 
      } 
    },
    { label: '5~6학년', filter: (s) => { 
        const y = getYear(s.생년월일); 
        return y >= currentYear - 12 && y <= currentYear - 11; 
      } 
    },
    { label: '중고등성인', filter: (s) => { 
        const y = getYear(s.생년월일); 
        return y > 0 && y <= currentYear - 13; 
      } 
    },
  ], [currentYear]);

  // 3. [핵심] 실시간 랭킹 및 동점자 처리
  const rankingData = useMemo(() => {
    if (!students || students.length === 0) return groups.map(g => ({ ...g, top3: [] }));

    return groups.map(group => {
      const filtered = students
        .filter(group.filter)
        .filter(s => {
          // 점수 추출: "81" 같은 문자열에서 숫자만 추출
          const score = parseInt(String(s[selectedCategory] || "0").replace(/[^0-9]/g, "")) || 0;
          return score > 0;
        })
        .sort((a, b) => {
          const valA = parseInt(String(a[selectedCategory] || "0").replace(/[^0-9]/g, "")) || 0;
          const valB = parseInt(String(b[selectedCategory] || "0").replace(/[^0-9]/g, "")) || 0;
          
          // 내림차순 정렬 (점수가 같으면 0을 반환하여 기존 시트 순서 유지 - 동점자 반영)
          return valB - valA;
        })
        .slice(0, 3); // 상위 3명만 표시

      return { ...group, top3: filtered };
    });
  }, [students, selectedCategory, groups]);

  if (isDataLoading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle}></div>
        <p style={{marginTop:'15px'}}>🏆 최신 랭킹을 집계 중입니다...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{margin:0, fontSize:'22px'}}>🏆 실시간 랭킹 보드</h2>
        <div style={tabBox}>
          {['30초모아', '30초번갈아', '30초이중뛰기'].map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...tabBtn,
                backgroundColor: selectedCategory === cat ? '#3b82f6' : '#2d303a',
                border: selectedCategory === cat ? '1px solid #3b82f6' : '1px solid #444',
                color: selectedCategory === cat ? '#fff' : '#94a3b8'
              }}
            >
              {cat.replace('30초', '30초 ')}
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
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={rankStyle(i)}>{i+1}</span>
                    <span style={nameStyle}>{s.이름}</span>
                  </div>
                  <span style={scoreStyle}>
                    {s[selectedCategory]}
                    <small style={{fontSize:'11px', marginLeft:'2px', color:'#888'}}>회</small>
                  </span>
                </div>
              )) : <div style={noneStyle}>기록된 데이터가 없습니다.</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- 스타일 정의 --- */
const containerStyle = { padding: '10px', color: '#fff', animation: 'fadeIn 0.5s ease-in' };
const headerStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', flexWrap:'wrap', gap:'15px' };
const tabBox = { display:'flex', gap:'8px' };
const tabBtn = { padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'bold', transition:'all 0.2s' };
const gridStyle = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' };
const cardStyle = { backgroundColor:'#24262d', borderRadius:'18px', border:'1px solid #333', overflow:'hidden', boxShadow:'0 10px 20px rgba(0,0,0,0.3)' };
const groupTitle = { backgroundColor:'#2d303a', padding:'14px', textAlign:'center', fontSize:'15px', fontWeight:'bold', color:'#3b82f6', borderBottom:'1px solid #333' };
const listStyle = { padding:'10px 20px' };
const itemStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid #1e2028' };
const rankStyle = (i) => ({ 
  display:'flex', justifyContent:'center', alignItems:'center',
  width:'26px', height:'26px', borderRadius:'8px', fontSize:'13px', fontWeight:'900',
  backgroundColor: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#333',
  color: '#fff', boxShadow: i < 3 ? '0 2px 8px rgba(0,0,0,0.4)' : 'none'
});
const nameStyle = { fontSize:'15px', fontWeight:'600', color:'#eee' };
const scoreStyle = { color:'#3b82f6', fontWeight:'800', fontSize:'18px' };
const noneStyle = { textAlign:'center', color:'#555', padding:'40px', fontSize:'13px', fontStyle:'italic' };
const loadingStyle = { display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'60vh', color:'#94a3b8' };
const spinnerStyle = { width:'40px', height:'40px', border:'4px solid #333', borderTop:'4px solid #3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' };

export default Ranking;