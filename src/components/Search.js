import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';

function Search({ students = [], setStudents }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceDates, setAttendanceDates] = useState([]); 
  const [isReplacing, setIsReplacing] = useState(false); 
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // 💡 [추가] 달력의 현재 표시 날짜를 제어 (튕김 방지 핵심)
  const [viewDate, setViewDate] = useState(new Date());
  const [currentViewYear, setCurrentViewYear] = useState(new Date().getFullYear());

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = async (searchId, targetDate) => {
    const target = (searchId || query).trim();
    if (!target) return;

    // 💡 달력 넘길 때 넘겨받은 날짜가 있다면 viewDate 업데이트
    if (targetDate) setViewDate(targetDate);

    const fetchDate = targetDate || viewDate; 
    const fetchYear = fetchDate.getFullYear();

    const found = students.find(s => 
      String(s.이름 || '').trim() === target || String(s.ID || '').trim() === target
    );

    if (found) {
      setSelectedStudent(found); 
      setIsReplacing(false);
      setIsLoadingLogs(true);

      try {
        const response = await requestGAS({
          method: 'GET',
          action: 'getLogs',
          studentId: found.ID,
          targetDate: fetchDate.toISOString() 
        });

        let rawLogs = [];
        if (response && response.status === "success") {
          rawLogs = response.data || [];
        } else if (Array.isArray(response)) {
          rawLogs = response;
        }

        const cleanDates = rawLogs.map(log => {
          const match = String(log).match(/(\d{4}-\d{2}-\d{2})/);
          return match ? match[1] : null;
        }).filter(Boolean);
        
        setAttendanceDates([...new Set(cleanDates)]);
        setCurrentViewYear(fetchYear);

      } catch (e) {
        console.error("❌ 로그 로드 실패:", e);
      } finally {
        setIsLoadingLogs(false);
      }
    } else {
      alert("등록된 학생이 없습니다.");
      setSelectedStudent(null);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeNFC(async (scannedId) => {
      if (isReplacing && selectedStudent) {
        if (!window.confirm(`${selectedStudent.이름} 학생의 카드를 교체할까요?`)) {
          setIsReplacing(false);
          return;
        }
        try {
          const res = await requestGAS({
            method: 'POST',
            action: 'updateStudentId',
            name: selectedStudent.이름,
            newId: scannedId
          });
          if (res.status === "success" || (res.data && res.data.status === "success")) {
            setStudents(prev => prev.map(s => s.이름 === selectedStudent.이름 ? { ...s, ID: scannedId } : s));
            setSelectedStudent(prev => ({ ...prev, ID: scannedId }));
            setIsReplacing(false);
            alert("✅ 교체 완료!");
          }
        } catch (err) { alert("❌ 오류 발생"); }
      } else {
        setQuery(scannedId);
        handleSearch(scannedId);
      }
    });
    return () => unsubscribe();
  }, [isReplacing, selectedStudent, students, viewDate]); // viewDate 의존성 추가

  return (
    <div style={containerStyle}>
      <style>{`
        .react-calendar__tile.attended-day { background-color: #10b981 !important; color: white !important; border-radius: 8px !important; font-weight: bold !important; }
        .react-calendar__tile--now { background-color: #3d414d !important; border: 2px solid #facc15 !important; color: #facc15 !important; }
        .react-calendar__tile--now.attended-day { background-color: #10b981 !important; color: white !important; border: 2px solid #fef08a !important; }
        .react-calendar__tile:enabled:hover { background-color: #4b5563 !important; }
        ${calendarCustomStyle(isMobile)}
      `}</style>

      <header style={headerStyle(isMobile)}>
        <h2 style={titleStyle(isMobile)}>학생 이력 조회</h2>
        <div style={searchBarContainer}>
          <input 
            style={searchInputStyle(isMobile)} 
            placeholder="이름/ID 입력" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
          />
          <button style={searchButtonStyle} onClick={() => handleSearch()}>검색</button>
        </div>
      </header>

      {selectedStudent ? (
        <div style={dashboardGrid(isMobile)}>
          <div style={profileCardStyle(isMobile)}>
            <div style={avatarLarge(isMobile)}>{selectedStudent.이름 ? selectedStudent.이름[0] : '?'}</div>
            <h3 style={profileName(isMobile)}>{selectedStudent.이름}</h3>
            <span style={idBadge}>ID: {selectedStudent.ID}</span>
            <div style={infoList(isMobile)}>
              <div style={infoItem}><span style={infoLabel}>보유 포인트</span><span style={infoValuePrimary}>{Number(selectedStudent.포인트 || 0).toLocaleString()} P</span></div>
              <div style={infoItem}><span style={infoLabel}>학부모 연락</span><span style={infoValue}>{selectedStudent.학부모전화번호 || '-'}</span></div>
              <div style={infoItem}><span style={infoLabel}>본인 연락</span><span style={infoValue}>{selectedStudent.본인전화번호 || '-'}</span></div>
              <div style={infoItem}><span style={infoLabel}>스케줄</span><span style={{...infoValue, fontSize: '12px'}}>{selectedStudent.수업스케줄 || '-'}</span></div>
            </div>
            <hr style={dividerStyle} />
            {!isReplacing ? (
              <button style={replaceBtnStyle} onClick={() => setIsReplacing(true)}>🔁 카드 분실/교체</button>
            ) : (
              <div style={replaceActiveBox}>
                <div className="pulse-icon">📡</div>
                <p style={{margin: '10px 0', fontSize: '13px', color: '#3b82f6', fontWeight: 'bold'}}>새 카드를 태그하세요</p>
                <button style={cancelBtnStyle} onClick={() => setIsReplacing(false)}>취소</button>
              </div>
            )}
          </div>

          <div style={calendarPanelStyle(isMobile)}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h4 style={panelTitle}>{currentViewYear}년 출석 히스토리</h4>
              {isLoadingLogs && <span style={loadingTextStyle}>조회 중...</span>}
            </div>
            
            <div style={calendarWrapper(isMobile)}>
              <Calendar 
                // 💡 [중요] key 속성을 제거하여 달력의 연속성을 유지합니다.
                activeStartDate={viewDate} // 💡 위치 고정
                onActiveStartDateChange={({ activeStartDate }) => {
                  setViewDate(activeStartDate); // 💡 이동한 위치 저장
                  if (selectedStudent && activeStartDate.getFullYear() !== currentViewYear) {
                    handleSearch(selectedStudent.ID, activeStartDate);
                  }
                }}
                locale="ko-KR" 
                calendarType="gregory" 
                formatDay={(l, d) => d.getDate()}
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const calendarDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; 
                    if (attendanceDates.includes(calendarDateStr)) return 'attended-day';
                  }
                  return null;
                }}
              />
            </div>
            <p style={noticeStyle}>* 초록색 날짜는 출석 기록이 있는 날입니다.</p>
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle(isMobile)}>학생을 검색하거나 카드를 태그해주세요.</div>
      )}
    </div>
  );
}

// 스타일 코드 생략 (기존과 동일)
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };
const headerStyle = (isMobile) => ({ padding: isMobile ? '20px 15px' : '30px 5%', borderBottom: '1px solid #333', backgroundColor: '#24262d' });
const titleStyle = (isMobile) => ({ margin: '0 0 15px 0', fontSize: isMobile ? '20px' : '24px', fontWeight: '800' });
const searchBarContainer = { display: 'flex', gap: '8px', maxWidth: '500px' };
const searchInputStyle = (isMobile) => ({ flex: 1, backgroundColor: '#1a1c23', border: '1px solid #3d414d', borderRadius: '10px', padding: isMobile ? '10px 15px' : '12px 20px', color: '#fff', outline: 'none', fontSize: isMobile ? '14px' : '16px' });
const searchButtonStyle = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: '700', cursor: 'pointer' };
const dashboardGrid = (isMobile) => ({ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', padding: isMobile ? '15px' : '30px 5%' });
const profileCardStyle = (isMobile) => ({ flex: isMobile ? 'none' : '1', backgroundColor: '#24262d', borderRadius: '20px', padding: isMobile ? '25px 20px' : '35px', textAlign: 'center', border: '1px solid #333', height: 'fit-content' });
const avatarLarge = (isMobile) => ({ width: isMobile ? '60px' : '80px', height: isMobile ? '60px' : '80px', backgroundColor: '#3b82f6', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '24px' : '32px', fontWeight: '800', margin: '0 auto 15px' });
const profileName = (isMobile) => ({ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', margin: '0 0 8px 0' });
const idBadge = { backgroundColor: '#333', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', color: '#888' };
const infoList = (isMobile) => ({ marginTop: isMobile ? '20px' : '30px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' });
const infoItem = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d303a', paddingBottom: '6px' };
const infoLabel = { color: '#71717a', fontSize: '13px' };
const infoValue = { color: '#eee', fontSize: '14px', fontWeight: '700' };
const infoValuePrimary = { color: '#3b82f6', fontSize: '15px', fontWeight: '800' };
const dividerStyle = { border: 'none', borderTop: '1px solid #333', margin: '20px 0' };
const replaceBtnStyle = { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #3b82f6', backgroundColor: 'transparent', color: '#3b82f6', fontWeight: '700', cursor: 'pointer', fontSize: '13px' };
const calendarPanelStyle = (isMobile) => ({ flex: isMobile ? 'none' : '1.5', backgroundColor: '#24262d', borderRadius: '20px', padding: isMobile ? '20px' : '30px', border: '1px solid #333' });
const calendarWrapper = (isMobile) => ({ backgroundColor: '#1a1c23', borderRadius: '12px', padding: isMobile ? '8px' : '15px', border: '1px solid #333' });
const panelTitle = { fontSize: '16px', fontWeight: '700', color: '#3b82f6' };
const loadingTextStyle = { color: '#10b981', fontSize: '12px', fontWeight: 'bold' };
const noticeStyle = { marginTop: '12px', color: '#555', fontSize: '11px', textAlign: 'center' };
const emptyStateStyle = (isMobile) => ({ textAlign: 'center', padding: isMobile ? '80px 20px' : '100px 5%', color: '#555', fontSize: '16px' });
const replaceActiveBox = { padding: '15px', backgroundColor: '#1e293b', borderRadius: '12px', border: '2px dashed #3b82f6', textAlign: 'center' };
const cancelBtnStyle = { backgroundColor: '#333', color: '#999', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' };

const calendarCustomStyle = (isMobile) => `
  .react-calendar { width: 100%; background: transparent; border: none; color: #fff; font-family: inherit; font-size: ${isMobile ? '12px' : '14px'}; }
  .react-calendar__navigation { margin-bottom: 10px; height: 35px; }
  .react-calendar__navigation button { color: #3b82f6; font-size: ${isMobile ? '14px' : '18px'}; min-width: 30px; }
  .react-calendar__month-view__weekdays { font-size: 11px; font-weight: 800; color: #555; }
  .react-calendar__tile { height: ${isMobile ? '45px' : '60px'} !important; color: #eee; padding: 5px !important; }
  .pulse-icon { font-size: 20px; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
`;

export default Search;