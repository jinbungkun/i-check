import React, { useState, useEffect } from 'react';
import { theme } from '../theme';

function ScheduleView({ students = [] }) {
  const [viewMode, setViewMode] = useState('daily');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  const todayNum = now.getDay();
  const todayName = days[todayNum];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getTodayFullString = () => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const getDisplayDate = (dayName) => {
    const targetDayNum = days.indexOf(dayName);
    const diff = targetDayNum - todayNum;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    return `${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')}`;
  };

  const getGroupedData = (targetDay, checkAttendance = false) => {
    if (!students) return {};
    const todayStr = getTodayFullString().replace(/\D/g, '');
    
    const dayStudents = students.filter(s => (s.수업스케줄 || s["수업 스케줄"] || "").includes(targetDay));

    const grouped = dayStudents.reduce((acc, s) => {
      const time = (s.수업스케줄 || s["수업 스케줄"] || "").match(/\d{2}:\d{2}/)?.[0] || "시간미정";
      
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
      <header style={headerStyle(isMobile)}>
        <div style={headerTextWrapper(isMobile)}>
          <h1 style={titleStyle(isMobile)}>스케줄 관리</h1>
          <p style={{ color: '#888', marginTop: '3px', fontSize: isMobile ? '12px' : '14px' }}>
            {getTodayFullString()} ({todayName})
          </p>
        </div>
        <div style={tabGroupStyle(isMobile)}>
          <button 
            onClick={() => setViewMode('daily')} 
            style={viewMode === 'daily' ? activeTab(isMobile) : inactiveTab(isMobile)}
          >
            오늘
          </button>
          <button 
            onClick={() => setViewMode('weekly')} 
            style={viewMode === 'weekly' ? activeTab(isMobile) : inactiveTab(isMobile)}
          >
            주간
          </button>
        </div>
      </header>

      <main style={mainContentStyle(isMobile)}>
        {viewMode === 'daily' ? (
          <DailyDashboard day={todayName} groupedData={getGroupedData(todayName, true)} isMobile={isMobile} />
        ) : (
          <WeeklyBoard 
            days={["월", "화", "수", "목", "금", "토"]} 
            getGroupedData={getGroupedData} 
            getDisplayDate={getDisplayDate} 
            isMobile={isMobile}
          />
        )}
      </main>
    </div>
  );
}

// --- 일간 대시보드 ---
const DailyDashboard = ({ day, groupedData, isMobile }) => (
  <div style={{ width: '100%' }}>
    <div style={infoBarStyle(isMobile)}>
      <span>📅 <b>{day}요일</b> 등원 예정</span>
      <span style={countTagStyle}>총 {Object.values(groupedData).flat().length}명</span>
    </div>
    {Object.keys(groupedData).length > 0 ? Object.entries(groupedData).map(([time, members]) => (
      <section key={time} style={timeSectorStyle(isMobile)}>
        <div style={timeIndicatorStyle(isMobile)}>{time}</div>
        <div style={cardGridStyle(isMobile)}>
          {members.map((s, i) => (
            <div key={i} style={s.isAttended ? attendedCard(isMobile) : studentCard(isMobile)}>
              <div style={s.isAttended ? attendBadge : waitBadge}>{s.isAttended ? "출석" : "대기"}</div>
              <div style={nameStyle(isMobile)}>{s.이름}</div>
              <div style={idStyle}>{s.ID}</div>
            </div>
          ))}
        </div>
      </section>
    )) : <div style={emptyState}>오늘은 수업이 없습니다.</div>}
  </div>
);

// --- 주간 보드 ---
const WeeklyBoard = ({ days, getGroupedData, getDisplayDate, isMobile }) => (
  <div style={weeklyGridStyle(isMobile)}>
    {days.map(day => {
      const grouped = getGroupedData(day, false);
      return (
        <div key={day} style={weeklyColStyle(isMobile)}>
          <div style={weeklyDayHeader(day)}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{day}</div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>{getDisplayDate(day)}</div>
          </div>
          <div style={{ padding: isMobile ? '10px' : '15px' }}>
            {Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([time, members]) => (
              <div key={time} style={{ marginBottom: '15px' }}>
                <div style={smallTimeLabel}>{time}</div>
                {members.map((s, i) => (
                  <div key={i} style={weeklyNameItem}>{s.이름}</div>
                ))}
              </div>
            )) : <div style={{ textAlign: 'center', color: '#555', marginTop: '20px', fontSize: '12px' }}>수업 없음</div>}
          </div>
        </div>
      );
    })}
  </div>
);

// --- 🎨 반응형 스타일 디자인 ---
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };

const headerStyle = (isMobile) => ({ 
  padding: isMobile ? '15px 15px' : '30px 5%', 
  backgroundColor: '#24262d', 
  borderBottom: '1px solid #333', 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center' 
});

const headerTextWrapper = (isMobile) => ({ display: 'flex', flexDirection: 'column' });

const titleStyle = (isMobile) => ({ margin: 0, fontSize: isMobile ? '18px' : '24px', fontWeight: '700' });

const mainContentStyle = (isMobile) => ({ padding: isMobile ? '15px' : '30px 5%', boxSizing: 'border-box' });

const tabGroupStyle = (isMobile) => ({ display: 'flex', backgroundColor: '#1a1c23', padding: '4px', borderRadius: '10px' });

const tabBase = (isMobile) => ({ padding: isMobile ? '8px 15px' : '10px 25px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: isMobile ? '13px' : '15px' });

const activeTab = (isMobile) => ({ ...tabBase(isMobile), backgroundColor: '#3b82f6', color: '#fff' });

const inactiveTab = (isMobile) => ({ ...tabBase(isMobile), backgroundColor: 'transparent', color: '#666' });

const infoBarStyle = (isMobile) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', fontSize: isMobile ? '15px' : '18px' });

const countTagStyle = { backgroundColor: '#333', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', color: '#3b82f6', border: '1px solid #3b82f644' };

const timeSectorStyle = (isMobile) => ({ 
  backgroundColor: '#24262d', borderRadius: '16px', padding: isMobile ? '15px' : '20px', 
  marginBottom: '15px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', 
  gap: isMobile ? '15px' : '30px', border: '1px solid #333' 
});

const timeIndicatorStyle = (isMobile) => ({ 
  minWidth: isMobile ? 'auto' : '85px', fontSize: isMobile ? '18px' : '22px', 
  fontWeight: '800', color: '#3b82f6', 
  borderRight: isMobile ? 'none' : '2px solid #333', 
  borderBottom: isMobile ? '2px solid #333' : 'none',
  paddingBottom: isMobile ? '8px' : '0',
  display: 'flex', alignItems: 'center' 
});

const cardGridStyle = (isMobile) => ({ 
  display: 'grid', 
  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))', 
  gap: isMobile ? '10px' : '15px', 
  width: '100%' 
});

const baseCard = (isMobile) => ({ padding: isMobile ? '15px 10px' : '20px 15px', borderRadius: '14px', textAlign: 'center', position: 'relative' });
const studentCard = (isMobile) => ({ ...baseCard(isMobile), backgroundColor: '#2d303a', border: '1px solid #3d414d' });
const attendedCard = (isMobile) => ({ ...baseCard(isMobile), backgroundColor: '#1e293b', border: '2px solid #3b82f6' });

const attendBadge = { fontSize: '10px', backgroundColor: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: '6px', position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)' };
const waitBadge = { fontSize: '10px', backgroundColor: '#444', color: '#aaa', padding: '1px 6px', borderRadius: '6px', position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)' };

const nameStyle = (isMobile) => ({ fontSize: isMobile ? '16px' : '19px', fontWeight: '700', marginTop: '10px' });
const idStyle = { fontSize: '11px', color: '#71717a', marginTop: '3px' };

const weeklyGridStyle = (isMobile) => ({ 
  display: 'flex', 
  gap: '12px', 
  // PC에서는 스크롤 없이 꽉 채우고, 모바일에서만 가로 스크롤 허용
  overflowX: isMobile ? 'auto' : 'hidden', 
  width: '100%',
  paddingBottom: '15px',
  WebkitOverflowScrolling: 'touch'
});
const weeklyColStyle = (isMobile) => ({ 
  // PC(isMobile=false)일 때는 flex: 1을 주어 등분 배분, 모바일은 고정 너비
  flex: isMobile ? '0 0 140px' : '1', 
  minWidth: isMobile ? '140px' : '0', 
  backgroundColor: '#24262d', 
  borderRadius: '16px', 
  border: '1px solid #333', 
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column'
});

const weeklyDayHeader = (day) => ({ padding: '12px', textAlign: 'center', backgroundColor: '#2d303a', borderBottom: '1px solid #333', borderRadius: '16px 16px 0 0' });
const smallTimeLabel = { fontSize: '11px', color: '#3b82f6', fontWeight: '800', marginBottom: '8px', display: 'block' };
const weeklyNameItem = { padding: '6px 10px', backgroundColor: '#1a1c23', borderRadius: '6px', marginBottom: '5px', fontSize: '13px', color: '#eee', border: '1px solid #333' };
const emptyState = { textAlign: 'center', padding: '60px 20px', color: '#555', fontSize: '16px' };

export default ScheduleView;