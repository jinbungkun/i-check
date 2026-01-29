import React, { useState } from 'react';
import { theme } from '../theme';

function ScheduleView({ students = [] }) {
  const [viewMode, setViewMode] = useState('daily');
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  const todayNum = now.getDay();
  const todayName = days[todayNum];

  // 📅 오늘 날짜 (YYYY-MM-DD) - 일간 출석 확인용
  const getTodayFullString = () => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // 📅 주간 날짜 표시용 (MM/DD)
  const getDisplayDate = (dayName) => {
    const targetDayNum = days.indexOf(dayName);
    const diff = targetDayNum - todayNum;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    return `${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')}`;
  };

  // ✍️ 데이터 그룹화 및 출석 로직
  const getGroupedData = (targetDay, checkAttendance = false) => {
    if (!students) return {};
    const todayStr = getTodayFullString().replace(/\D/g, '');
    
    const dayStudents = students.filter(s => (s.수업스케줄 || s["수업 스케줄"] || "").includes(targetDay));

    const grouped = dayStudents.reduce((acc, s) => {
      const time = (s.수업스케줄 || s["수업 스케줄"] || "").match(/\d{2}:\d{2}/)?.[0] || "시간미정";
      
      // 일간 보기(checkAttendance = true)일 때만 오늘 날짜와 비교해서 출석 여부 판단
      let isAttended = false;
      if (checkAttendance) {
        const lastAt = String(s.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);
        isAttended = lastAt === todayStr;
      }

      if (!acc[time]) acc[time] = [];
      acc[time].push({ ...s, isAttended });
      return acc;
    }, {});

    return Object.keys(grouped).sort().reduce((obj, key) => { obj[key] = grouped[key]; return obj; }, {});
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>학원 스케줄 관리</h1>
          <p style={{ color: '#888', marginTop: '5px', fontSize: '14px' }}>{getTodayFullString()} ({todayName}요일)</p>
        </div>
        <div style={tabGroupStyle}>
          <button onClick={() => setViewMode('daily')} style={viewMode === 'daily' ? activeTab : inactiveTab}>오늘 출석부</button>
          <button onClick={() => setViewMode('weekly')} style={viewMode === 'weekly' ? activeTab : inactiveTab}>전체 시간표</button>
        </div>
      </header>

      <main style={mainContentStyle}>
        {viewMode === 'daily' ? (
          <DailyDashboard day={todayName} groupedData={getGroupedData(todayName, true)} />
        ) : (
          <WeeklyBoard days={["월", "화", "수", "목", "금", "토"]} getGroupedData={getGroupedData} getDisplayDate={getDisplayDate} />
        )}
      </main>
    </div>
  );
}

// --- 일간 대시보드: 출석 상태 확인 가능 ---
const DailyDashboard = ({ day, groupedData }) => (
  <div style={{ width: '100%' }}>
    <div style={infoBarStyle}>
      <span>📅 <b>{day}요일</b> 등원 예정</span>
      <span style={countTagStyle}>총 {Object.values(groupedData).flat().length}명</span>
    </div>
    {Object.keys(groupedData).length > 0 ? Object.entries(groupedData).map(([time, members]) => (
      <section key={time} style={timeSectorStyle}>
        <div style={timeIndicatorStyle}>{time}</div>
        <div style={cardGridStyle}>
          {members.map((s, i) => (
            <div key={i} style={s.isAttended ? attendedCard : studentCard}>
              <div style={s.isAttended ? attendBadge : waitBadge}>{s.isAttended ? "출석완료" : "미출석"}</div>
              <div style={nameStyle}>{s.이름}</div>
              <div style={idStyle}>{s.ID}</div>
            </div>
          ))}
        </div>
      </section>
    )) : <div style={emptyState}>오늘은 수업이 없습니다.</div>}
  </div>
);

// --- 주간 보드: 출석 표시 없이 시간표 정보만 깔끔하게 ---
const WeeklyBoard = ({ days, getGroupedData, getDisplayDate }) => (
  <div style={weeklyGridStyle}>
    {days.map(day => {
      const grouped = getGroupedData(day, false); // 주간은 출석체크 제외
      return (
        <div key={day} style={weeklyColStyle}>
          <div style={weeklyDayHeader(day)}>
            <div style={{ fontSize: '17px' }}>{day}</div>
            <div style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.7 }}>{getDisplayDate(day)}</div>
          </div>
          <div style={{ padding: '15px' }}>
            {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([time, members]) => (
              <div key={time} style={{ marginBottom: '20px' }}>
                <div style={smallTimeLabel}>{time}</div>
                {members.map((s, i) => (
                  <div key={i} style={weeklyNameItem}>{s.이름}</div>
                ))}
              </div>
            )) : <div style={{ textAlign: 'center', color: '#555', marginTop: '20px', fontSize: '13px' }}>수업 없음</div>}
          </div>
        </div>
      );
    })}
  </div>
);

// --- 스타일 디자인 (어두운 배경 DashBoard 테마) ---
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };
const headerStyle = { padding: '30px 5% 20px 5%', backgroundColor: '#24262d', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const titleStyle = { margin: 0, fontSize: '24px', fontWeight: '700' };
const mainContentStyle = { padding: '30px 5%', boxSizing: 'border-box' };
const tabGroupStyle = { display: 'flex', backgroundColor: '#1a1c23', padding: '5px', borderRadius: '12px' };
const tabBase = { padding: '10px 25px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };
const activeTab = { ...tabBase, backgroundColor: '#3b82f6', color: '#fff' };
const inactiveTab = { ...tabBase, backgroundColor: 'transparent', color: '#999' };
const infoBarStyle = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', fontSize: '18px' };
const countTagStyle = { backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', color: '#3b82f6' };
const timeSectorStyle = { backgroundColor: '#24262d', borderRadius: '16px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '30px', border: '1px solid #333' };
const timeIndicatorStyle = { minWidth: '85px', fontSize: '22px', fontWeight: '800', color: '#3b82f6', borderRight: '2px solid #333', display: 'flex', alignItems: 'center' };
const cardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px', width: '100%' };
const baseCard = { padding: '20px 15px', borderRadius: '14px', textAlign: 'center', position: 'relative' };
const studentCard = { ...baseCard, backgroundColor: '#2d303a', border: '1px solid #3d414d' };
const attendedCard = { ...baseCard, backgroundColor: '#1e293b', border: '2px solid #3b82f6' };
const attendBadge = { fontSize: '11px', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '10px', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' };
const waitBadge = { fontSize: '11px', backgroundColor: '#444', color: '#aaa', padding: '2px 8px', borderRadius: '10px', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' };
const nameStyle = { fontSize: '19px', fontWeight: '700', marginTop: '12px' };
const idStyle = { fontSize: '12px', color: '#71717a', marginTop: '5px' };
const weeklyGridStyle = { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px' };
const weeklyColStyle = { minWidth: '190px', flex: 1, backgroundColor: '#24262d', borderRadius: '16px', border: '1px solid #333', minHeight: '500px' };
const weeklyDayHeader = (day) => ({ padding: '18px', textAlign: 'center', backgroundColor: '#2d303a', borderBottom: '1px solid #333' });
const smallTimeLabel = { fontSize: '12px', color: '#3b82f6', fontWeight: '800', marginBottom: '10px', display: 'block' };
const weeklyNameItem = { padding: '8px 12px', backgroundColor: '#1a1c23', borderRadius: '8px', marginBottom: '6px', fontSize: '14px', color: '#eee', border: '1px solid #333' };
const emptyState = { textAlign: 'center', padding: '100px', color: '#555', fontSize: '18px' };

export default ScheduleView;