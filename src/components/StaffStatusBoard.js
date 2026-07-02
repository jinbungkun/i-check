import React, { useMemo } from 'react';

const StaffStatusBoard = ({ students }) => {
  // 1. 데이터 처리 로직 (useMemo를 사용하여 students가 바뀔 때만 정확히 계산)
  const { scheduleMap, allSlots } = useMemo(() => {
    const scheduleMap = {}; // { 요일: { 시간: 인원수 } }
    const allSlots = {};    // { 요일: Set }

    if (!Array.isArray(students)) return { scheduleMap, allSlots: {} };

    students.forEach((s) => {
      try {
        if (!s) return;

        // [핵심 수정] 엑셀의 '상태' 열 값을 정밀하게 필터링
        const status = String(s.status || '').trim();
        
        // ✨ '재원'이 아닌 모든 상태(휴원 등)는 통계에서 완전히 제외합니다.
        if (status !== '재원') return;

        const scheduleStr = String(s.classSchedule || '').trim();
        if (!scheduleStr) return;

        // 쉼표로 분리
        const individualSchedules = scheduleStr.split(',');

        individualSchedules.forEach(item => {
          const cleanItem = item.trim();
          if (!cleanItem) return; // 빈 문자열 패스

          // [정규식] 요일 뒤에 바로 붙은 숫자를 정확히 타겟팅 ("월14" 등)
          const match = cleanItem.match(/([월화수목금토])\s*(\d{1,2})/);
          
          if (match) {
            const day = match[1];
            const hour = parseInt(match[2], 10);
            
            // 시간대 유효성 검사 (0시 ~ 23시 사이 정상적인 시간만)
            if (hour >= 0 && hour < 24) {
              const formattedTime = `${String(hour).padStart(2, '0')}:00`;

              // 인원 카운트
              if (!scheduleMap[day]) scheduleMap[day] = {};
              if (!scheduleMap[day][formattedTime]) scheduleMap[day][formattedTime] = 0;
              scheduleMap[day][formattedTime]++;

              // 요일별 시간 슬롯 수집
              if (!allSlots[day]) allSlots[day] = new Set();
              allSlots[day].add(formattedTime);
            }
          }
        });
      } catch (err) {
        console.error("Error processing student:", err);
      }
    });

    // Set을 배열로 변환하고 시간순 정렬
    const sortedSlots = {};
    Object.keys(allSlots).forEach(day => {
      sortedSlots[day] = Array.from(allSlots[day]).sort();
    });

    return { scheduleMap, allSlots: sortedSlots };
  }, [students]);

  // 2. 스타일 정의
  const containerStyle = { padding: '20px', backgroundColor: '#1e293b', minHeight: '100vh' };
  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' };
  const dayCardStyle = { backgroundColor: '#334155', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
  const dayTitleStyle = { color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', borderBottom: '1px solid #475569', paddingBottom: '10px' };
  const timeRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #475569' };
  const statusBadgeStyle = (isFull) => ({
    fontSize: '0.75rem', 
    padding: '4px 8px', 
    borderRadius: '6px', 
    color: '#fff', 
    backgroundColor: isFull ? '#ef4444' : '#10b981',
    fontWeight: 'bold'
  });

  const daysOrder = ['월', '화', '수', '목', '금', '토'];

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#fff', marginBottom: '10px', textAlign: 'center' }}>📅 실시간 수강 현황</h2>
      {/* 텍스트 수정: 현재 상황에 맞게 직관적으로 변경 */}
      <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '30px' }}>현재 '재원' 중인 정규 수강생 기준입니다.</p>

      <div style={gridStyle}>
        {daysOrder.map(day => {
          if (!allSlots[day] || allSlots[day].length === 0) return null;

          return (
            <div key={day} style={dayCardStyle}>
              <div style={dayTitleStyle}>✨ {day}요일</div>
              {allSlots[day].map(slot => {
                const count = (scheduleMap[day] && scheduleMap[day][slot]) || 0;
                const isFull = count >= 8;

                return (
                  <div key={slot} style={timeRowStyle}>
                    <span style={{ color: '#cbd5e1' }}>{slot}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem' }}>{count}명</span>
                      <span style={statusBadgeStyle(isFull)}>{isFull ? '마감' : '모집중'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#0f172a', borderRadius: '12px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
        * 실제 수업 스케줄에 존재하는 시간대만 자동으로 표시됩니다.<br />
        {/* 텍스트 수정 */}
        * 휴원 상태이거나 정규 수강생이 아닌 경우 통계에서 제외됩니다.
      </div>
    </div>
  );
};

export default StaffStatusBoard;