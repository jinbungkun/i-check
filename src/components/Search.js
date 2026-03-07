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
  
  // 💡 [추가] 스케줄 수정 모드 상태 및 입력값 관리
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState('');

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

    if (targetDate) setViewDate(targetDate);
    const fetchDate = targetDate || viewDate; 
    const fetchYear = fetchDate.getFullYear();

    const found = students.find(s => 
      String(s.이름 || '').trim() === target || String(s.ID || '').trim() === target
    );

    if (found) {
      setSelectedStudent(found); 
      setNewSchedule(found.수업스케줄 || ''); // 검색 시 현재 스케줄 세팅
      setIsReplacing(false);
      setIsEditingSchedule(false); // 수정 모드 초기화
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

  // 💡 [추가] 스케줄 업데이트 함수
  const handleUpdateSchedule = async () => {
    if (!selectedStudent) return;
    
    try {
      const res = await requestGAS({
        method: 'POST',
        action: 'updateStudent',
        studentData: {
          ...selectedStudent,
          수업스케줄: newSchedule // 바뀐 스케줄만 덮어씌움
        }
      });

      if (res.status === "success" || (res.data && res.data.status === "success")) {
        // 리액트 상태 동기화
        const updatedStudent = { ...selectedStudent, 수업스케줄: newSchedule };
        setStudents(prev => prev.map(s => s.ID === selectedStudent.ID ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        setIsEditingSchedule(false);
        alert("✅ 스케줄이 수정되었습니다.");
      }
    } catch (err) {
      alert("❌ 수정 중 오류가 발생했습니다.");
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
  }, [isReplacing, selectedStudent, students, viewDate]);

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
              
              {/* 💡 스케줄 영역: 수정 모드 여부에 따라 UI 변경 */}
              <div style={{...infoItem, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none'}}>
                <div style={{display:'flex', justifyContent:'space-between', width:'100%', marginBottom: '5px'}}>
                   <span style={infoLabel}>스케줄</span>
                   {!isEditingSchedule ? (
                     <button onClick={() => setIsEditingSchedule(true)} style={miniBtnStyle}>수정</button>
                   ) : (
                     <div style={{display:'flex', gap:'5px'}}>
                       <button onClick={handleUpdateSchedule} style={{...miniBtnStyle, color:'#10b981'}}>저장</button>
                       <button onClick={() => {setIsEditingSchedule(false); setNewSchedule(selectedStudent.수업스케줄);}} style={{...miniBtnStyle, color:'#ef4444'}}>취소</button>
                     </div>
                   )}
                </div>
                {isEditingSchedule ? (
                  <input 
                    style={editInputStyle} 
                    value={newSchedule} 
                    onChange={(e) => setNewSchedule(e.target.value)} 
                    placeholder="예: 월 14:00, 수 16:00"
                  />
                ) : (
                  <span style={{...infoValue, fontSize: '13px', backgroundColor: '#1a1c23', padding: '8px', borderRadius: '8px', width: '100%', boxSizing: 'border-box'}}>
                    {selectedStudent.수업스케줄 || '-'}
                  </span>
                )}
              </div>
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
                activeStartDate={viewDate} 
                onActiveStartDateChange={({ activeStartDate }) => {
                  setViewDate(activeStartDate); 
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

// --- 추가된 스타일 ---
const miniBtnStyle = { background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '2px 5px' };
const editInputStyle = { width: '100%', backgroundColor: '#1a1c23', border: '1px solid #3b82f6', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px', outline: 'none' };

// --- 기존 스타일 유지 ---
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