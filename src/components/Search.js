import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';
import LoadingState from './common/LoadingState';
import StatusBanner from './common/StatusBanner';

function Search({ students = [], setStudents }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceDates, setAttendanceDates] = useState([]); 
  const [isReplacing, setIsReplacing] = useState(false); 
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [status, setStatus] = useState({ type: 'info', msg: '' });
  
  // 💡 [추가] 스케줄 수정 모달 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSchedule, setTempSchedule] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewDate, setViewDate] = useState(new Date());
  const [currentViewYear, setCurrentViewYear] = useState(new Date().getFullYear());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const days = ["월", "화", "수", "목", "금", "토", "일"];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = async (searchId, targetDate) => {
    const target = (searchId || query).trim();
    if (!target) {
      setStatus({ type: 'info', msg: '조회할 학생 이름이나 ID를 입력해주세요.' });
      return;
    }
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
      setStatus({ type: 'loading', msg: '출석 기록을 불러오는 중입니다...' });
      try {
        const response = await requestGAS({
          method: 'GET', action: 'getLogs', studentId: found.ID, targetDate: fetchDate.toISOString() 
        });
        let rawLogs = response?.status === "success" ? response.data : (Array.isArray(response) ? response : []);
        const cleanDates = rawLogs.map(log => String(log).match(/(\d{4}-\d{2}-\d{2})/)?.[1]).filter(Boolean);
        setAttendanceDates([...new Set(cleanDates)]);
        setCurrentViewYear(fetchYear);
        setStatus({ type: 'success', msg: `${found.이름} 학생의 기록을 불러왔습니다.` });
      } catch (e) {
        console.error("❌ 로그 로드 실패:", e);
        setStatus({ type: 'error', msg: '❌ 기록을 불러오지 못했습니다.' });
      } 
      finally { setIsLoadingLogs(false); }
    } else {
      setStatus({ type: 'error', msg: '❌ 등록된 학생이 없습니다.' });
      setSelectedStudent(null);
    }
  };

  // 💡 스케줄 수정 모달 열기
  const openScheduleModal = () => {
    setTempSchedule(selectedStudent.수업스케줄 || '');
    setIsModalOpen(true);
  };

  // 💡 스케줄 태그 추가 (Register.js 로직)
  const addScheduleTag = () => {
    if (!selectedDay) { alert("요일을 선택해주세요!"); return; }
    const newTag = `${selectedDay}${selectedTime}`;
    const currentTags = tempSchedule ? tempSchedule.split(', ') : [];
    if (currentTags.includes(newTag)) return;
    setTempSchedule([...currentTags, newTag].join(', '));
  };

  // 💡 스케줄 태그 삭제
  const removeScheduleTag = (tag) => {
    const filtered = tempSchedule.split(', ').filter(item => item !== tag).join(', ');
    setTempSchedule(filtered);
  };

  // 💡 서버에 저장 (updateStudent 액션 활용)
  const saveSchedule = async () => {
    setIsSubmitting(true);
    try {
      const res = await requestGAS({
        method: 'POST',
        action: 'updateStudent',
        studentData: { ...selectedStudent, 수업스케줄: tempSchedule }
      });

      if (res.status === "success" || res.data?.status === "success") {
        const updatedStudent = { ...selectedStudent, 수업스케줄: tempSchedule };
        setStudents(prev => prev.map(s => s.ID === selectedStudent.ID ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        setIsModalOpen(false);
        alert("✅ 스케줄이 성공적으로 변경되었습니다.");
      }
    } catch (err) {
      alert("❌ 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeNFC(async (scannedId) => {
      if (isReplacing && selectedStudent) {
        if (!window.confirm(`${selectedStudent.이름} 학생의 카드를 교체할까요?`)) { setIsReplacing(false); return; }
        try {
          const res = await requestGAS({ method: 'POST', action: 'updateStudentId', name: selectedStudent.이름, newId: scannedId });
          if (res.status === "success" || res.data?.status === "success") {
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
  }, [handleSearch, isReplacing, selectedStudent, setStudents, students]);

  return (
    <div style={containerStyle}>
      <style>{`
        .react-calendar__tile.attended-day { background-color: #10b981 !important; color: white !important; border-radius: 8px !important; font-weight: bold !important; }
        .react-calendar__tile--now { background-color: #3d414d !important; border: 2px solid #facc15 !important; color: #facc15 !important; }
        .react-calendar__tile:enabled:hover { background-color: #4b5563 !important; }
        ${calendarCustomStyle(isMobile)}
      `}</style>

      {/* 헤더 및 검색바 */}
      <header style={headerStyle(isMobile)}>
        <h2 style={titleStyle(isMobile)}>학생 이력 조회</h2>
        <div style={searchBarContainer}>
          <input style={searchInputStyle(isMobile)} placeholder="이름/ID 입력" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <button style={searchButtonStyle} onClick={() => handleSearch()}>검색</button>
        </div>
      </header>

      {status.msg && <StatusBanner type={status.type || 'info'} message={status.msg} style={{ margin: '16px 5% 0' }} />}

      {selectedStudent ? (
        <div style={dashboardGrid(isMobile)}>
          {/* 프로필 카드 */}
          <div style={profileCardStyle(isMobile)}>
            <div style={avatarLarge(isMobile)}>{selectedStudent.이름 ? selectedStudent.이름[0] : '?'}</div>
            <h3 style={profileName(isMobile)}>{selectedStudent.이름}</h3>
            <span style={idBadge}>ID: {selectedStudent.ID}</span>
            <div style={infoList(isMobile)}>
              <div style={infoItem}><span style={infoLabel}>보유 포인트</span><span style={infoValuePrimary}>{Number(selectedStudent.포인트 || 0).toLocaleString()} P</span></div>
              <div style={infoItem}><span style={infoLabel}>학부모 연락</span><span style={infoValue}>{selectedStudent.학부모전화번호 || '-'}</span></div>
              <div style={infoItem}><span style={infoLabel}>본인 연락</span><span style={infoValue}>{selectedStudent.본인전화번호 || '-'}</span></div>
              
              {/* 스케줄 표시 및 수정 버튼 */}
              <div style={{...infoItem, flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none'}}>
                <div style={{display:'flex', justifyContent:'space-between', width:'100%', marginBottom: '8px'}}>
                   <span style={infoLabel}>수업 스케줄</span>
                   <button onClick={openScheduleModal} style={miniEditBtnStyle}>변경하기</button>
                </div>
                <div style={scheduleDisplayBox}>
                  {selectedStudent.수업스케줄 ? selectedStudent.수업스케줄.split(', ').map((s, i) => (
                    <span key={i} style={miniTagStyle}>{s}</span>
                  )) : <span style={{color:'#555'}}>등록된 스케줄 없음</span>}
                </div>
              </div>
            </div>
            <hr style={dividerStyle} />
            {!isReplacing ? (
              <button style={replaceBtnStyle} onClick={() => setIsReplacing(true)}>🔁 카드 분실/교체</button>
            ) : (
              <div style={replaceActiveBox}><p>📡 새 카드를 태그하세요</p><button style={cancelBtnStyle} onClick={() => setIsReplacing(false)}>취소</button></div>
            )}
          </div>

          {/* 달력 패널 */}
          <div style={calendarPanelStyle(isMobile)}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h4 style={panelTitle}>{currentViewYear}년 출석 히스토리</h4>
              {isLoadingLogs && <span style={loadingTextStyle}>조회 중...</span>}
            </div>
            <div style={calendarWrapper(isMobile)}>
              {isLoadingLogs ? (
                <div style={{ padding: '20px 0' }}>
                  <LoadingState message="출석 기록을 불러오는 중입니다..." size="small" />
                </div>
              ) : (
                <Calendar activeStartDate={viewDate} onActiveStartDateChange={({ activeStartDate }) => { setViewDate(activeStartDate); if (selectedStudent && activeStartDate.getFullYear() !== currentViewYear) handleSearch(selectedStudent.ID, activeStartDate); }} locale="ko-KR" calendarType="gregory" formatDay={(l, d) => d.getDate()} tileClassName={({ date, view }) => (view === 'month' && attendanceDates.includes(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)) ? 'attended-day' : null} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle(isMobile)}>학생을 검색하거나 카드를 태그해주세요.</div>
      )}

      {/* 💡 [수정 모달] Register.js 스타일 적용 */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle(isMobile)}>
            <h3 style={{color: '#fff', marginBottom: '20px', fontSize: '18px'}}>📅 스케줄 수정: {selectedStudent.이름}</h3>
            
            <div style={modalSelectorBox}>
              <div style={modalDayGroup}>
                {days.map(d => (
                  <button key={d} onClick={() => setSelectedDay(d)} style={selectedDay === d ? modalDayBtnActive : modalDayBtn}>
                    {d}
                  </button>
                ))}
              </div>
              <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} style={modalTimeInput} />
                <button onClick={addScheduleTag} style={modalAddBtn}>추가</button>
              </div>
            </div>

            <div style={modalResultBox}>
              <label style={{color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', display:'block', marginBottom:'10px'}}>설정된 스케줄 (클릭 시 삭제)</label>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                {tempSchedule ? tempSchedule.split(', ').map((s, i) => (
                  <span key={i} style={modalTag} onClick={() => removeScheduleTag(s)}>{s} ×</span>
                )) : <span style={{color: '#555', fontSize: '13px'}}>스케줄이 없습니다.</span>}
              </div>
            </div>

            <div style={modalActionBox}>
              <button onClick={() => setIsModalOpen(false)} style={modalCancelBtn}>취소</button>
              <button onClick={saveSchedule} disabled={isSubmitting} style={isSubmitting ? modalSaveBtnDisabled : modalSaveBtn}>
                {isSubmitting ? '저장 중...' : '변경사항 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎨 스타일 정의 (기존 스타일 유지 + 모달 스타일 추가)
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalContentStyle = (isMobile) => ({ backgroundColor: '#24262d', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '500px', border: '1px solid #333' });
const modalSelectorBox = { backgroundColor: '#1a1c23', padding: '15px', borderRadius: '12px', marginBottom: '20px' };
const modalDayGroup = { display: 'flex', justifyContent: 'space-between', gap: '5px' };
const modalDayBtn = { flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid #3d414d', backgroundColor: '#24262d', color: '#999', cursor: 'pointer', fontSize: '12px' };
const modalDayBtnActive = { ...modalDayBtn, backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' };
const modalTimeInput = { flex: 1, backgroundColor: '#24262d', border: '1px solid #3d414d', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' };
const modalAddBtn = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' };
const modalResultBox = { marginBottom: '30px', minHeight: '80px' };
const modalTag = { backgroundColor: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f6', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' };
const modalActionBox = { display: 'flex', gap: '10px' };
const modalSaveBtn = { flex: 2, backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: '800', cursor: 'pointer' };
const modalSaveBtnDisabled = { ...modalSaveBtn, backgroundColor: '#333', color: '#777' };
const modalCancelBtn = { flex: 1, backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', cursor: 'pointer' };

const miniEditBtnStyle = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' };
const scheduleDisplayBox = { display: 'flex', flexWrap: 'wrap', gap: '5px', backgroundColor: '#1a1c23', padding: '10px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' };
const miniTagStyle = { backgroundColor: '#3b82f622', color: '#3b82f6', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', border: '1px solid #3b82f6' };

// (기존 스타일 속성들은 Search.js 원본과 동일하게 유지...)
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
const infoValuePrimary = { color: '#3b82f6', fontSize: '15px', fontWeight: '800' };
const infoValue = { color: '#eee', fontSize: '14px', fontWeight: '700' };
const dividerStyle = { border: 'none', borderTop: '1px solid #333', margin: '20px 0' };
const replaceBtnStyle = { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #3b82f6', backgroundColor: 'transparent', color: '#3b82f6', fontWeight: '700', cursor: 'pointer', fontSize: '13px' };
const calendarPanelStyle = (isMobile) => ({ flex: isMobile ? 'none' : '1.5', backgroundColor: '#24262d', borderRadius: '20px', padding: isMobile ? '20px' : '30px', border: '1px solid #333' });
const calendarWrapper = (isMobile) => ({ backgroundColor: '#1a1c23', borderRadius: '12px', padding: isMobile ? '8px' : '15px', border: '1px solid #333' });
const panelTitle = { fontSize: '16px', fontWeight: '700', color: '#3b82f6' };
const loadingTextStyle = { color: '#10b981', fontSize: '12px', fontWeight: 'bold' };
const emptyStateStyle = (isMobile) => ({ textAlign: 'center', padding: isMobile ? '80px 20px' : '100px 5%', color: '#555', fontSize: '16px' });
const replaceActiveBox = { padding: '15px', backgroundColor: '#1e293b', borderRadius: '12px', border: '2px dashed #3b82f6', textAlign: 'center' };
const cancelBtnStyle = { backgroundColor: '#333', color: '#999', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' };

const calendarCustomStyle = (isMobile) => `
  .react-calendar { width: 100%; background: transparent; border: none; color: #fff; font-family: inherit; font-size: ${isMobile ? '12px' : '14px'}; }
  .react-calendar__navigation button { color: #3b82f6; font-size: ${isMobile ? '14px' : '18px'}; }
  .react-calendar__tile { height: ${isMobile ? '45px' : '60px'} !important; color: #eee; }
`;

export default Search;