import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import { theme } from '../theme';

function Search({ students = [] }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceDates, setAttendanceDates] = useState([]); // 출석 로그용

  // 검색 로직
  const handleSearch = () => {
    const searchQuery = query.trim();
    if (!searchQuery) return;

    const found = students.find(s => 
      String(s.이름) === searchQuery || String(s.ID) === searchQuery
    );

    if (found) {
      setSelectedStudent(found);
      // 현재는 로그 데이터가 없으므로 마지막출석일만 달력에 점으로 표시해봅니다.
      if (found.마지막출석일) {
        const lastDate = found.마지막출석일.substring(0, 10); // "YYYY-MM-DD"
        setAttendanceDates([lastDate]);
      }
    } else {
      alert("등록된 학생이 없습니다.");
      setSelectedStudent(null);
    }
  };

  return (
    <div style={containerStyle}>
      <style>{calendarCustomStyle}</style> {/* 달력 다크모드 커스텀 CSS */}
      
      <header style={headerStyle}>
        <h2 style={titleStyle}>학생 이력 조회</h2>
        <div style={searchBarContainer}>
          <input
            style={searchInputStyle}
            placeholder="학생 이름 또는 ID를 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button style={searchButtonStyle} onClick={handleSearch}>검색</button>
        </div>
      </header>

      {selectedStudent ? (
        <div style={dashboardGrid}>
          {/* 왼쪽: 학생 프로필 카드 */}
          <div style={profileCardStyle}>
            <div style={avatarLarge}>{selectedStudent.이름[0]}</div>
            <h3 style={profileName}>{selectedStudent.이름}</h3>
            <span style={idBadge}>ID: {selectedStudent.ID}</span>
            
            <div style={infoList}>
              <div style={infoItem}>
                <span style={infoLabel}>보유 포인트</span>
                <span style={infoValuePrimary}>{Number(selectedStudent.포인트 || 0).toLocaleString()} P</span>
              </div>
              <div style={infoItem}>
                <span style={infoLabel}>생년월일</span>
                <span style={infoValue}>{selectedStudent.생년월일 || '-'}</span>
              </div>
              <div style={infoItem}>
                <span style={infoLabel}>본인 연락처</span>
                <span style={infoValue}>{selectedStudent.본인전화번호 || '-'}</span>
              </div>
              <div style={infoItem}>
                <span style={infoLabel}>학부모 연락처</span>
                <span style={infoValue}>{selectedStudent.학부모전화번호 || '-'}</span>
              </div>
            </div>
          </div>

          {/* 오른쪽: 출석 달력 패널 */}
          <div style={calendarPanelStyle}>
            <h4 style={panelTitle}>출석 히스토리</h4>
            <div style={calendarWrapper}>
              <Calendar
                locale="ko-KR"
                calendarType="gregory"
                formatDay={(locale, date) => date.getDate()}
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    const dateStr = date.toLocaleDateString('sv-SE'); 
                    if (attendanceDates.includes(dateStr)) {
                      return <div className="dot">●</div>;
                    }
                  }
                  return null;
                }}
              />
            </div>
            <p style={noticeStyle}>* 점(●) 표시된 날짜는 출석 기록이 있는 날입니다.</p>
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle}>
          학생을 검색하면 상세 정보와 출석 이력을 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}

// --- 스타일 디자인 ---
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff', padding: '0' };
const headerStyle = { padding: '30px 5%', borderBottom: '1px solid #333', backgroundColor: '#24262d' };
const titleStyle = { margin: '0 0 20px 0', fontSize: '24px', fontWeight: '800' };

const searchBarContainer = { display: 'flex', gap: '10px', maxWidth: '500px' };
const searchInputStyle = { flex: 1, backgroundColor: '#1a1c23', border: '1px solid #3d414d', borderRadius: '12px', padding: '12px 20px', color: '#fff', outline: 'none', fontSize: '15px' };
const searchButtonStyle = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 25px', fontWeight: '700', cursor: 'pointer' };

const dashboardGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', padding: '30px 5%' };

const profileCardStyle = { backgroundColor: '#24262d', borderRadius: '24px', padding: '40px 30px', textAlign: 'center', border: '1px solid #333' };
const avatarLarge = { width: '80px', height: '80px', backgroundColor: '#3b82f6', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', margin: '0 auto 20px' };
const profileName = { fontSize: '24px', fontWeight: '800', margin: '0 0 10px 0' };
const idBadge = { backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', color: '#999' };

const infoList = { marginTop: '40px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' };
const infoItem = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d303a', paddingBottom: '10px' };
const infoLabel = { color: '#71717a', fontSize: '14px', fontWeight: '600' };
const infoValue = { color: '#eee', fontSize: '15px', fontWeight: '700' };
const infoValuePrimary = { color: '#3b82f6', fontSize: '16px', fontWeight: '800' };

const calendarPanelStyle = { backgroundColor: '#24262d', borderRadius: '24px', padding: '30px', border: '1px solid #333' };
const panelTitle = { fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#3b82f6' };
const calendarWrapper = { backgroundColor: '#1a1c23', borderRadius: '16px', padding: '15px', border: '1px solid #333' };
const noticeStyle = { marginTop: '15px', color: '#555', fontSize: '12px', textAlign: 'center' };
const emptyStateStyle = { textAlign: 'center', padding: '100px 5%', color: '#555', fontSize: '18px' };

// --- 💡 React-Calendar 다크모드 커스텀 CSS ---
const calendarCustomStyle = `
  .react-calendar { width: 100%; background: transparent; border: none; font-family: sans-serif; color: #fff; }
  .react-calendar__navigation { margin-bottom: 10px; }
  .react-calendar__navigation button { color: #3b82f6; font-size: 18px; font-weight: bold; }
  .react-calendar__navigation button:enabled:hover { background-color: #2d303a; }
  .react-calendar__month-view__weekdays { color: #71717a; font-weight: bold; font-size: 13px; }
  .react-calendar__tile { height: 50px; color: #eee; font-size: 14px; position: relative; border-radius: 8px; }
  .react-calendar__tile:enabled:hover { background-color: #3b82f6 !important; color: #fff; }
  .react-calendar__tile--now { background: #2d303a !important; color: #3b82f6 !important; font-weight: bold; }
  .react-calendar__tile--active { background: #3b82f6 !important; color: white !important; }
  .dot { color: #3b82f6; font-size: 10px; position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); }
`;

export default Search;