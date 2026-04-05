import React, { useState, useEffect, useMemo } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';

function Ranking() {
  const [students, setStudents] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('30초모아');

  // 1. 데이터 로드 (GAS에서 받은 원본 데이터를 그대로 저장)
  useEffect(() => {
    const fetchRankingData = async () => {
      setIsDataLoading(true);
      try {
        const res = await requestGAS({ action: 'getStudents' });
        if (res.status === "success") {
          // 외부 헬퍼(DataHelper) 없이 원본 데이터를 바로 상태에 저장
          setStudents(res.data || []);
        }
      } catch (e) {
        console.error("랭킹 데이터 로드 실패:", e);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchRankingData();
  }, []);

  // 💡 [내부 로직] 올해 연도 및 연도 추출 함수
  const currentYear = new Date().getFullYear();
  const getYear = (dateStr) => {
    if (!dateStr) return 0;
    const match = String(dateStr).match(/\d{4}/); 
    return match ? parseInt(match[0]) : 0;
  };

  // 2. [내부 로직] 학년군 정의 및 자동 승급 필터
  const groups = useMemo(() => [
    { label: '유치부', filter: (y) => y >= currentYear - 6 }, 
    { label: '1~2학년', filter: (y) => y >= currentYear - 8 && y <= currentYear - 7 }, 
    { label: '3~4학년', filter: (y) => y >= currentYear - 10 && y <= currentYear - 9 }, 
    { label: '5~6학년', filter: (y) => y >= currentYear - 12 && y <= currentYear - 11 }, 
    { label: '중고등성인', filter: (y) => y > 0 && y <= currentYear - 13 },
  ], [currentYear]);

  // 3. [내부 로직] 원본 데이터에서 직접 랭킹 산출 (동점자 및 문자열 처리 포함)
  const rankingData = useMemo(() => {
    if (!students.length) return groups.map(g => ({ ...g, top3: [] }));

    return groups.map(group => {
      const top3 = students
        .filter(s => {
          // 상태가 '재원'인 학생만 포함 (선택 사항)
          if (s.상태 !== "재원") return false;
          
          const birthYear = getYear(s.생년월일);
          if (!group.filter(birthYear)) return false;

          // 점수 추출 (문자열 "81" -> 숫자 81)
          const score = parseInt(String(s[selectedCategory] || "0").replace(/[^0-9]/g, "")) || 0;
          return score > 0;
        })
        .sort((a, b) => {
          const valA = parseInt(String(a[selectedCategory] || "0").replace(/[^0-9]/g, "")) || 0;
          const valB = parseInt(String(b[selectedCategory] || "0").replace(/[^0-9]/g, "")) || 0;
          return valB - valA; // 내림차순 정렬 (동점자는 시트 순서 유지)
        })
        .slice(0, 3);

      return { ...group, top3 };
    });
  }, [students, selectedCategory, groups]);

  if (isDataLoading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle}></div>
        <p style={{marginTop:'15px'}}>🏆 실시간 랭킹 집계 중...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{margin:0, fontSize:'22px'}}>🏆 실시간 랭킹</h2>
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
                <div key={s.ID || i} style={itemStyle}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={rankStyle(i)}>{i+1}</span>
                    <span style={nameStyle}>{s.이름}</span>
                  </div>
                  <span style={scoreStyle}>
                    {s[selectedCategory]}<small style={{fontSize:'12px', marginLeft:'2px', color:'#888'}}>회</small>
                  </span>
                </div>
              )) : <div style={noneStyle}>기록 없음</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- 스타일 정의 --- */
const containerStyle = { padding: '10px', color: '#fff' };
const headerStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', flexWrap:'wrap', gap:'15px' };
const tabBox = { display:'flex', gap:'8px' };
const tabBtn = { padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'bold', border:'none', transition:'0.2s' };
const gridStyle = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' };
const cardStyle = { backgroundColor:'#24262d', borderRadius:'18px', border:'1px solid #333', overflow:'hidden' };
const groupTitle = { backgroundColor:'#2d303a', padding:'14px', textAlign:'center', fontSize:'15px', fontWeight:'bold', color:'#3b82f6' };
const listStyle = { padding:'10px 20px' };
const itemStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid #1e2028' };
const rankStyle = (i) => ({ 
  display:'flex', justifyContent:'center', alignItems:'center', width:'26px', height:'26px', borderRadius:'8px', 
  fontSize:'13px', fontWeight:'900', color: '#fff',
  backgroundColor: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#333'
});
const nameStyle = { fontSize:'15px', fontWeight:'600' };
const scoreStyle = { color:'#3b82f6', fontWeight:'800', fontSize:'18px' };
const noneStyle = { textAlign:'center', color:'#555', padding:'40px', fontSize:'13px' };
const loadingStyle = { display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'60vh', color:'#94a3b8' };
const spinnerStyle = { width:'40px', height:'40px', border:'4px solid #333', borderTop:'4px solid #3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' };

export default Ranking;