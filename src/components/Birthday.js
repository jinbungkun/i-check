import React, { useState, useMemo } from 'react';

function Birthday({ students = [] }) {
  // 💡 상태 관리: 현재 보고 있는 월 (기본값: 이번 달)
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth() + 1;

  // 오늘 날짜 정보 (D-Day 계산용)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  // ◀ 이전달 / 다음달 이동 함수
  const changeMonth = (offset) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  // 💡 월별 생일자 필터링 및 D-Day 계산 로직
  const birthdayBoys = useMemo(() => {
    return students
      .filter(s => {
        if (!s.생년월일) return false;
        if (s.상태 && s.상태 !== '재원') return false;
        const month = parseInt(s.생년월일.split(/\D/)[1]);
        return month === currentMonth;
      })
      .map(s => {
        const day = parseInt(s.생년월일.split(/\D/)[2]);
        // 올해 해당 월/일로 날짜 객체 생성
        const bDayThisYear = new Date(now.getFullYear(), currentMonth - 1, day);
        
        // D-Day 계산
        const diffTime = bDayThisYear.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let dDayText = "";
        if (diffDays === 0) dDayText = "오늘 생일! 🎉";
        else if (diffDays > 0) dDayText = `${diffDays}일 남음`;
        else dDayText = `${Math.abs(diffDays)}일 지남`;

        return { ...s, day, dDayText, isToday: diffDays === 0, isPast: diffDays < 0 };
      })
      .sort((a, b) => a.day - b.day);
  }, [students, currentMonth, today, now, currentYear]);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={todayBadgeStyle}>오늘: {todayStr}</div>
        
        <div style={monthPickerStyle}>
          <button onClick={() => changeMonth(-1)} style={arrowButtonStyle}>◀</button>
          <h1 style={titleStyle}>{currentYear}년 {currentMonth}월 생일</h1>
          <button onClick={() => changeMonth(1)} style={arrowButtonStyle}>▶</button>
        </div>
        
        <p style={subTitleStyle}>아이들의 소중한 기념일을 확인하세요.</p>
      </header>

      <main style={mainStyle}>
        {birthdayBoys.length > 0 ? (
          <div style={gridStyle}>
            {birthdayBoys.map((s, i) => (
              <div key={i} style={{
                ...cardStyle, 
                border: s.isToday ? '2px solid #fbbf24' : '1px solid #333',
                backgroundColor: s.isToday ? '#2d2a22' : '#24262d'
              }}>
                <div style={emojiStyle}>{s.isToday ? '🎂' : '🎁'}</div>
                <div style={nameStyle}>{s.이름}</div>
                <div style={dateStyle}>{s.생년월일}</div>
                <div style={{
                  ...dDayBadgeStyle,
                  backgroundColor: s.isToday ? '#fbbf24' : (s.isPast ? '#4b5563' : '#3b82f6'),
                  color: s.isToday ? '#000' : '#fff'
                }}>
                  {s.dDayText}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>
            <p>{currentMonth}월에는 생일인 친구가 없네요. 🎈</p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- 🎨 스타일 ---
const containerStyle = { padding: '20px', backgroundColor: '#1a1c23', minHeight: '100vh', color: '#fff' };
const headerStyle = { textAlign: 'center', marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const todayBadgeStyle = { backgroundColor: '#334155', padding: '5px 15px', borderRadius: '20px', fontSize: '13px', color: '#94a3b8', marginBottom: '15px' };
const monthPickerStyle = { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' };
const arrowButtonStyle = { backgroundColor: 'transparent', border: 'none', color: '#3b82f6', fontSize: '20px', cursor: 'pointer', padding: '10px' };
const titleStyle = { fontSize: '26px', color: '#fff', margin: 0, fontWeight: '800' };
const subTitleStyle = { fontSize: '14px', color: '#888' };

const mainStyle = { maxWidth: '900px', margin: '0 auto' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' };
const cardStyle = { 
  padding: '25px 20px', 
  borderRadius: '20px', 
  textAlign: 'center', 
  transition: 'transform 0.2s',
  position: 'relative'
};
const emojiStyle = { fontSize: '32px', marginBottom: '12px' };
const nameStyle = { fontSize: '20px', fontWeight: 'bold', marginBottom: '6px' };
const dateStyle = { fontSize: '13px', color: '#94a3b8', marginBottom: '15px' };
const dDayBadgeStyle = { 
  padding: '6px 12px', 
  borderRadius: '12px', 
  fontSize: '13px', 
  fontWeight: 'bold',
  display: 'inline-block'
};
const emptyStyle = { textAlign: 'center', padding: '100px 0', color: '#4b5563', fontSize: '18px' };

export default Birthday;