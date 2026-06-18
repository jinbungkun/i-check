import React, { useState, useEffect, useRef, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { getStudent, updateStudent } from '../utils/DataHelper';

function ScheduleView({ students = [], setStudents }) {
  const [viewMode, setViewMode] = useState('daily');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const messageTimerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [extraSchedules, setExtraSchedules] = useState([]); 
  const [showModal, setShowModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  const todayNum = now.getDay();
  const todayName = days[todayNum];

  // 💡 오늘 날짜 문자열 생성 (한국 시간 기준 안전한 포맷)
  const getTodayFullString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    date: getTodayFullString(), // 초기값 오늘 날짜
    name: '',
    time: '14:00',
    type: '보강'
  });

  const clearAttendanceStatus = useCallback(() => {
    setAttendanceStatus('');
  }, []);

  const handleScheduleAttendance = async (scheduleStudent) => {
    if (!scheduleStudent) return;
    if (scheduleStudent.isExtra && scheduleStudent.유형 === '체험') {
      setAttendanceStatus('⚠️ 체험 학생은 출석 처리 대상이 아닙니다.');
      messageTimerRef.current = setTimeout(clearAttendanceStatus, 4000);
      return;
    }
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);

    const name = scheduleStudent.이름 || scheduleStudent.name || '학생';
    const targetStudent = scheduleStudent.ID
      ? getStudent(students, scheduleStudent.ID) || getStudent(students, name)
      : getStudent(students, name);

    if (!targetStudent) {
      setAttendanceStatus(`⚠️ ${name} 학생 정보를 찾을 수 없습니다.`);
      messageTimerRef.current = setTimeout(clearAttendanceStatus, 4000);
      return;
    }

    const todayStr = getTodayFullString().replace(/\D/g, '').substring(0, 8);
    const lastAt = String(targetStudent.마지막출석일 || '').replace(/\D/g, '').substring(0, 8);

    if (lastAt === todayStr) {
      setAttendanceStatus(`⚠️ ${name} 학생은 이미 오늘 출석 처리되었습니다.`);
      messageTimerRef.current = setTimeout(clearAttendanceStatus, 4000);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const updatedStudent = { ...targetStudent, 마지막출석일: `${getTodayFullString()} ${timeStr}` };

    if (typeof setStudents === 'function') {
      setStudents(prev => updateStudent(prev, updatedStudent));
    }

    try {
      await requestGAS({
        method: 'POST',
        action: 'checkIn',
        studentId: targetStudent.ID,
        studentName: targetStudent.이름 || name
      });
      setAttendanceStatus(`✅ ${name} 출석 완료되었습니다.`);
      // 💡 출석 처리 후 보강/체험 목록 갱신
      setTimeout(() => fetchExtras(), 300);
    } catch (error) {
      console.error('출석 저장 실패:', error);
      setAttendanceStatus(`⚠️ ${name} 출석 처리 중 오류가 발생했습니다.`);
    }

    messageTimerRef.current = setTimeout(clearAttendanceStatus, 4000);
  };

  useEffect(() => {
    fetchExtras(); 
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [students]);

  const fetchExtras = async () => {
    setIsSyncing(true);
    try {
      const res = await requestGAS({ action: 'getExtraSchedules' });
      const actualData = res?.data || res; 
      if (Array.isArray(actualData)) {
        setExtraSchedules(actualData);
      }
    } catch (e) { 
      console.error("보강 데이터 로드 실패", e); 
    } finally {
      setIsSyncing(false);
    }
  };

  // 💡 모달 열기: 열 때마다 날짜를 오늘로 최신화
  const handleOpenModal = () => {
    setFormData({
      date: getTodayFullString(),
      name: '',
      time: '14:00',
      type: '보강'
    });
    setShowModal(true);
  };

  const handleSaveExtra = async () => {
    if (!formData.name) return alert("이름을 입력하세요.");
    
    // 1️⃣ 즉시 모달 닫기 & 팝업 띄우기 (서버 응답 기다리지 않음)
    setShowModal(false);
    alert("등록 요청을 보냈습니다. 곧 목록에 반영됩니다.");

    const payload = {
      method: 'POST',
      action: 'addExtraSchedule',
      ...formData,
      id: "" 
    };

    try {
      // 2️⃣ 서버 통신은 백그라운드에서 실행
      const res = await requestGAS(payload);
      const result = res?.data || res;
      
      if (result.status === "success") {
        // 3️⃣ 뒤에서 성공하면 목록만 살짝 새로고침
        fetchExtras(); 
      }
    } catch (e) { 
      // 실패했을 때만 알려줌
      console.error("서버 통신 실패", e);
      alert(`${formData.name} 학생 등록 중 오류가 발생했습니다. 다시 확인해 주세요.`); 
    }
  };

  const getDisplayDate = (dayName) => {
    const targetDayNum = days.indexOf(dayName);
    const diff = targetDayNum - todayNum;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    return `${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')}`;
  };

 const getGroupedData = (targetDay, checkAttendance = false) => {
    const todayStr = getTodayFullString().replace(/\D/g, '');
    const safeStudents = Array.isArray(students) ? students : [];

    // 1. 해당 요일에 수업이 있는 학생만 필터링
  const dayStudents = safeStudents.filter(s => {
      const schedule = s?.수업스케줄 || s?.["수업 스케줄"] || "";
      // ✨ 추가된 조건: 상태가 '재원'인 경우만 포함 (비어있거나 다른 값이면 제외)
      const isActive = s?.상태 === "재원"; 
      
      return schedule.includes(targetDay) && isActive;
    });

    // 2. 보강/체험 데이터 필터링
    const dayExtras = extraSchedules.filter(ex => {
      try {
        if (!ex.날짜) return false;
        const dateMatch = String(ex.날짜).match(/\d{4}-\d{2}-\d{2}/);
        if (!dateMatch) return false;
        const [y, m, d] = dateMatch[0].split('-').map(Number);
        const exDate = new Date(y, m - 1, d);
        return days[exDate.getDay()] === targetDay;
      } catch (e) {
        return false;
      }
    }).map(ex => ({
      ...ex,
      이름: ex.이름 || ex.name || '',
      수업스케줄: `${ex.시간 || '시간미정'} (${ex.유형 || '보강'})`,
      isExtra: true
    }));

    const combined = [...dayStudents, ...dayExtras];

    // 3. 시간대별 그룹화 로직 핵심 수정
    const grouped = combined.reduce((acc, s) => {
      let time = "시간미정";

      if (s.isExtra) {
        const rawTime = String(s.시간 || "");
        const timeMatch = rawTime.match(/(\d{1,2}:\d{2})/);
        time = timeMatch ? timeMatch[0] : "시간미정";
      } else {
        const scheduleStr = s?.수업스케줄 || s?.["수업 스케줄"] || "";
        
        // 💡 수정 포인트: 현재 요일(targetDay) 바로 뒤에 오는 시간만 추출
        // 예: '화17:00, 목18:00' 에서 targetDay가 '목'이면 '18:00'을 가져옴
        const daySpecificRegex = new RegExp(`${targetDay}\\s*(\\d{1,2}:\\d{2})`);
        const match = scheduleStr.match(daySpecificRegex);
        
        if (match) {
          time = match[1]; 
        } else {
          // 예외 상황 대비 첫 시간 추출
          const firstTimeMatch = scheduleStr.match(/(\d{1,2}:\d{2})/);
          time = firstTimeMatch ? firstTimeMatch[0] : "시간미정";
        }
      }

      // 시간 포맷 통일 (9:00 -> 09:00) 하여 정렬 오류 방지
      if (time !== "시간미정" && /^\d:\d{2}$/.test(time)) time = "0" + time;

      let isAttended = false;
      if (checkAttendance) {
        if (s.isExtra) {
          // 💡 보강/체험의 경우, 같은 이름의 정규 학생을 찾아서 출석 여부 확인
          const matchedStudent = safeStudents.find(student => 
            String(student?.이름).trim() === String(s?.이름).trim()
          );
          if (matchedStudent) {
            const lastAt = String(matchedStudent?.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);
            isAttended = lastAt === todayStr;
          }
        } else {
          // 정규 학생은 자신의 마지막출석일로 확인
          const lastAt = String(s?.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);
          isAttended = lastAt === todayStr;
        }
      }

      if (!acc[time]) acc[time] = [];
      acc[time].push({ ...s, isAttended });
      return acc;
    }, {});

    // 시간순 정렬 후 반환
    return Object.keys(grouped).sort().reduce((obj, key) => {
      obj[key] = grouped[key];
      return obj;
    }, {});
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle(isMobile)}>
        <div style={headerTextWrapper(isMobile)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={titleStyle(isMobile)}>스케줄 관리</h1>
            {isSyncing && <span style={syncLabelStyle}>🔄 로딩중</span>}
          </div>
          {/* 💡 handleOpenModal 사용 */}
          <button style={addBtnStyle} onClick={handleOpenModal}>+ 추가</button>
        </div>
        <div style={tabGroupStyle(isMobile)}>
          <button onClick={() => setViewMode('daily')} style={viewMode === 'daily' ? activeTab(isMobile) : inactiveTab(isMobile)}>오늘</button>
          <button onClick={() => setViewMode('weekly')} style={viewMode === 'weekly' ? activeTab(isMobile) : inactiveTab(isMobile)}>주간</button>
        </div>
      </header>

      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent(isMobile)}>
            <h3 style={{marginTop: 0, color: '#3b82f6'}}>보강/체험 등록</h3>
            <div style={inputGroup}><label style={labelStyle}>유형</label>
              <select style={inputStyle} value={formData.type} onChange={e=>setFormData({...formData, type:e.target.value})}>
                <option value="보강">보강</option><option value="체험">체험</option>
              </select>
            </div>
            <div style={inputGroup}><label style={labelStyle}>이름</label>
              <input style={inputStyle} value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} placeholder="학생 이름 입력" />
            </div>
            <div style={inputGroup}><label style={labelStyle}>날짜</label>
              <input type="date" style={inputStyle} value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})} />
            </div>
            <div style={inputGroup}><label style={labelStyle}>시간</label>
              <input type="time" style={inputStyle} value={formData.time} onChange={e=>setFormData({...formData, time:e.target.value})} />
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button style={saveBtnStyle} onClick={handleSaveExtra}>저장</button>
              <button style={cancelBtnStyle} onClick={() => setShowModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      <main style={mainContentStyle(isMobile)}>
        {viewMode === 'daily' ? (
          <DailyDashboard
            day={todayName}
            groupedData={getGroupedData(todayName, true)}
            isMobile={isMobile}
            attendanceStatus={attendanceStatus}
            onCheckIn={handleScheduleAttendance}
          />
        ) : (
          <WeeklyBoard days={["월", "화", "수", "목", "금", "토"]} getGroupedData={getGroupedData} getDisplayDate={getDisplayDate} isMobile={isMobile} />
        )}
      </main>
    </div>
  );
}

const DailyDashboard = ({ day, groupedData, isMobile, attendanceStatus, onCheckIn }) => (
  <div style={{ width: '100%' }}>
    <div style={infoBarStyle(isMobile)}>
      <span>📅 <b>{day}요일</b></span>
      <span style={countTagStyle}>오늘 총 {Object.values(groupedData).flat().length}명</span>
    </div>
    {attendanceStatus ? <div style={attendanceMessageStyle}>{attendanceStatus}</div> : null}
    
    {Object.keys(groupedData).length > 0 ? Object.entries(groupedData).map(([time, members]) => (
      <section key={time} style={timeSectorStyle(isMobile)}>
        <div style={timeIndicatorStyle(isMobile)}>
          {time}
          {/* 💡 시간 바로 아래에 해당 시간대 인원수 추가 */}
          <div style={timeCountStyle}>{members.length}명</div>
        </div>
        
        <div style={cardGridStyle(isMobile)}>
          {members.map((s, i) => {
            const isExtraClass = s.isExtra;
            const cardStyle = isExtraClass ? extraCard(isMobile) : (s.isAttended ? attendedCard(isMobile) : studentCard(isMobile));
            const badgeText = isExtraClass ? s.유형 : (s.isAttended ? '출석' : '미출석');
            const badgeStyle = isExtraClass ? extraBadge : (s.isAttended ? attendBadge : waitBadge);

            return (
              <div key={i} style={cardStyle}>
                <div style={badgeStyle}>{badgeText}</div>
                <div style={nameStyle(isMobile)}>{s.이름 || s.name || '이름 없음'}</div>
                <div style={{ marginTop: 'auto', width: '100%' }}>
                  {s.isAttended ? (
                    s.isExtra ? (
                      <button style={disabledButtonStyle} disabled>✓ 출석</button>
                    ) : (
                      <div style={attendedTextStyle}>✓ 출석</div>
                    )
                  ) : (
                    !s.isExtra || s.유형 === '보강' ? (
                      <button style={checkInButtonStyle} onClick={() => onCheckIn(s)} onMouseEnter={(e) => {e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'}} onMouseLeave={(e) => {e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'}}>
                        ✓ 출석
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    )) : <div style={emptyState}>수업이 없습니다.</div>}
  </div>
);

const WeeklyBoard = ({ days, getGroupedData, getDisplayDate, isMobile }) => (
  <div style={weeklyGridStyle(isMobile)}>
    {days.map(day => {
      const grouped = getGroupedData(day, false);
      return (
        <div key={day} style={weeklyColStyle(isMobile)}>
          <div style={weeklyDayHeader(day)}>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{day}</div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>{getDisplayDate(day)}</div>
          </div>
          <div style={{ padding: '10px' }}>
            {Object.keys(grouped).map(time => (
              <div key={time} style={{ marginBottom: '12px' }}>
                {/* 💡 시간과 인원수를 함께 표시 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={smallTimeLabel}>{time}</div>
                  <div style={weeklyCountBadge}>{grouped[time].length}명</div>
                </div>
                
                {grouped[time].map((s, i) => (
                  <div key={i} style={s.isExtra ? weeklyExtraItem : weeklyNameItem}>
                    {s.이름} {s.isExtra && `(${s.유형[0]})`}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

// --- 🎨 스타일 (기존 스타일 유지) ---
const weeklyCountBadge = {
  fontSize: '10px',
  color: '#d8d8d8',
  backgroundColor: '#333',
  padding: '1px 5px',
  borderRadius: '4px',
  fontWeight: 'normal'
};
const timeCountStyle = {
  fontSize: '12px',
  color: '#d8d8d8',
  fontWeight: 'normal',
  marginTop: '4px'
};
const syncLabelStyle = { fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', backgroundColor: '#3b82f622', padding: '2px 8px', borderRadius: '10px' };
const addBtnStyle = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const extraCard = (isMobile) => ({ ...studentCard(isMobile), border: '1px dashed #8b5cf6', backgroundColor: '#2d2142' });
const extraBadge = { fontSize: '10px', backgroundColor: '#8b5cf6', color: '#fff', padding: '1px 6px', borderRadius: '6px', position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)' };
const weeklyExtraItem = { padding: '5px 8px', backgroundColor: '#2d2142', borderRadius: '6px', marginBottom: '4px', fontSize: '12px', color: '#a78bfa', border: '1px solid #8b5cf644' };
const attendanceMessageStyle = {
  marginBottom: '16px',
  padding: '12px 16px',
  borderRadius: '12px',
  backgroundColor: '#172554',
  color: '#c7d2fe',
  border: '1px solid #334155',
  fontSize: '14px'
};
const checkInButtonStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#3b82f6',
  color: '#fff',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};
const disabledButtonStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '8px',
  border: '1px solid #3b82f6',
  backgroundColor: '#1e293b',
  color: '#94a3b8',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'not-allowed',
  opacity: 0.8
};
const modalOverlay = { position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContent = (isMobile) => ({ backgroundColor:'#24262d', padding:isMobile?'20px':'40px', borderRadius:'20px', width:isMobile?'85%':'400px', border:'1px solid #333' });
const inputGroup = { marginBottom:'15px' };
const labelStyle = { display:'block', fontSize:'12px', color:'#888', marginBottom:'5px' };
const inputStyle = { width:'100%', padding:'10px', borderRadius:'8px', backgroundColor:'#1a1c23', border:'1px solid #333', color:'#fff', boxSizing:'border-box' };
const saveBtnStyle = { flex:1, padding:'12px', backgroundColor:'#3b82f6', border:'none', borderRadius:'8px', color:'#fff', fontWeight:'bold' };
const cancelBtnStyle = { flex:1, padding:'12px', backgroundColor:'#333', border:'none', borderRadius:'8px', color:'#ccc' };
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };
const headerStyle = (isMobile) => ({ padding: isMobile ? '15px' : '20px 5%', backgroundColor: '#24262d', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
const headerTextWrapper = (isMobile) => ({ display: 'flex', flexDirection: 'column', gap: '5px' });
const titleStyle = (isMobile) => ({ margin: 0, fontSize: isMobile ? '18px' : '24px' });
const mainContentStyle = (isMobile) => ({ padding: isMobile ? '15px' : '20px 5%' });
const tabGroupStyle = (isMobile) => ({ display: 'flex', backgroundColor: '#1a1c23', padding: '4px', borderRadius: '10px' });
const tabBase = (isMobile) => ({ padding: isMobile ? '6px 12px' : '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: isMobile ? '13px' : '15px' });
const activeTab = (isMobile) => ({ ...tabBase(isMobile), backgroundColor: '#3b82f6', color: '#fff' });
const inactiveTab = (isMobile) => ({ ...tabBase(isMobile), backgroundColor: 'transparent', color: '#666' });
const infoBarStyle = (isMobile) => ({ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' });
const countTagStyle = { backgroundColor: '#333', padding: '2px 10px', borderRadius: '10px', color: '#3b82f6', fontSize: '12px' };
const timeSectorStyle = (isMobile) => ({ backgroundColor: '#24262d', borderRadius: '15px', padding: '15px', marginBottom: '15px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', border: '1px solid #333' });
const timeIndicatorStyle = (isMobile) => ({ minWidth: '70px', fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', borderRight: isMobile ? 'none' : '1px solid #333', borderBottom: isMobile ? '1px solid #333' : 'none' });
const cardGridStyle = (isMobile) => ({ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', width: '100%' });
const baseCard = (isMobile) => ({ padding: '15px 10px', borderRadius: '12px', textAlign: 'center', position: 'relative', minHeight: isMobile ? '120px' : '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' });
const studentCard = (isMobile) => ({ ...baseCard(isMobile), backgroundColor: '#2d303a', border: '1px solid #3d414d' });
const attendedCard = (isMobile) => ({ ...baseCard(isMobile), backgroundColor: '#1e293b', border: '1px solid #3b82f6' });
const attendBadge = { fontSize: '10px', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '999px', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' };
const waitBadge = { fontSize: '10px', backgroundColor: '#444', color: '#aaa', padding: '2px 8px', borderRadius: '999px', position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' };
const nameStyle = (isMobile) => ({ fontSize: isMobile ? '16px' : '17px', fontWeight: 'bold', color: '#fff', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' });
const attendedTextStyle = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#3b82f6',
  padding: '6px 12px',
  borderRadius: '6px',
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  border: '1px solid #3b82f6'
};
const weeklyGridStyle = (isMobile) => ({ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' });
const weeklyColStyle = (isMobile) => ({ flex: '0 0 140px', backgroundColor: '#24262d', borderRadius: '12px', border: '1px solid #333', minHeight: '400px' });
const weeklyDayHeader = (day) => ({ padding: '10px', textAlign: 'center', backgroundColor: '#2d303a', borderBottom: '1px solid #333', borderRadius: '12px 12px 0 0' });
const smallTimeLabel = { fontSize: '11px', color: '#3b82f6', fontWeight: 'bold' };
const weeklyNameItem = { padding: '5px 8px', backgroundColor: '#1a1c23', borderRadius: '6px', marginBottom: '4px', fontSize: '12px', border: '1px solid #333' };
const emptyState = { textAlign: 'center', padding: '40px', color: '#555' };

export default ScheduleView;