import React, { useState, useEffect, useRef, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMonth, setActiveMonth] = useState(new Date());

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

  const formatDateKey = (date) => {
    if (!date) return '';
    const targetDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(targetDate.getTime())) return '';
    return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  };

  const parseExtraDateKey = (rawValue) => {
    if (!rawValue && rawValue !== 0) return '';
    const value = String(rawValue).trim();
    if (!value) return '';

    const isoMatch = value.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateKey(parsed);
  };

  const parseLocalDate = (dateKey) => {
    if (!dateKey) return null;
    const parts = String(dateKey).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return null;
    const [, year, month, day] = parts;
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const getWeekRange = (baseDate = new Date()) => {
    const start = new Date(baseDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const normalizeExtraSchedules = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map(item => {
      if (!item) return null;
      if (Array.isArray(item)) {
        const [date, name, time, type] = item;
        return { 날짜: date, 이름: name, 시간: time, 유형: type };
      }
      if (typeof item === 'object') {
        return {
          날짜: item['날짜'] ?? item['date'] ?? item['Date'] ?? '',
          이름: item['이름'] ?? item['name'] ?? item['Name'] ?? '',
          시간: item['시간'] ?? item['time'] ?? item['Time'] ?? '',
          유형: item['유형'] ?? item['type'] ?? item['Type'] ?? '보강'
        };
      }
      return null;
    }).filter(Boolean);
  };

  // fetchExtras: useCallback으로 감싸서 안정적인 참조 유지
  const fetchExtras = useCallback(async (startDate, endDate) => {
    setIsSyncing(true);
    try {
      const res = await requestGAS({ 
        action: 'getExtraSchedules',
        startDate: startDate || '',
        endDate: endDate || ''
      });
      const actualData = res?.data || res; 
      if (Array.isArray(actualData)) {
        setExtraSchedules(prev => {
          const normalized = normalizeExtraSchedules(actualData);
          return normalized;
        });
      } else {
        setExtraSchedules([]);
      }
    } catch (e) { 
      console.error("보강 데이터 로드 실패", e); 
      setExtraSchedules([]);
    } finally {
      setIsSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshCurrentSchedules = useCallback((currentMode, currentMonth) => {
    const mode = currentMode || viewMode;
    const month = currentMonth || activeMonth;
    if (mode === 'daily') {
      const todayStr = formatDateKey(new Date());
      fetchExtras(todayStr, todayStr);
    } else if (mode === 'weekly') {
      const { start, end } = getWeekRange(new Date());
      fetchExtras(formatDateKey(start), formatDateKey(end));
    } else if (mode === 'monthly') {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      fetchExtras(formatDateKey(start), formatDateKey(end));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activeMonth, fetchExtras]);

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
      // 출석 후 현재 모드에 맞는 목록 새로고침
      setTimeout(() => refreshCurrentSchedules(), 300);
    } catch (error) {
      console.error('출석 저장 실패:', error);
      setAttendanceStatus(`⚠️ ${name} 출석 처리 중 오류가 발생했습니다.`);
    }

    messageTimerRef.current = setTimeout(clearAttendanceStatus, 4000);
  };

  // ─────────────────────────────────────────────
  // 📡 탭/월 변경 시에만 데이터 새로 로드
  //   - daily: 오늘 하루만
  //   - weekly: 이번 주 월~일
  //   - monthly: activeMonth의 1일~말일  (selectedDate 변경은 여기 포함 안 됨)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === 'daily') {
      const todayStr = formatDateKey(new Date());
      fetchExtras(todayStr, todayStr);
    } else if (viewMode === 'weekly') {
      const { start, end } = getWeekRange(new Date());
      fetchExtras(formatDateKey(start), formatDateKey(end));
    } else if (viewMode === 'monthly') {
      const start = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
      const end = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
      fetchExtras(formatDateKey(start), formatDateKey(end));
    }
  // activeMonth, viewMode, fetchExtras만 의존 — selectedDate는 의도적으로 제외
  }, [viewMode, activeMonth, fetchExtras]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

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
      
      if (result.status === "success" || result.ok) {
        // 3️⃣ 뒤에서 성공하면 목록만 살짝 새로고침
        refreshCurrentSchedules(); 
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

  const getGroupedData = (targetDayOrDate, checkAttendance = false, scope = 'daily') => {
    const todayStr = getTodayFullString().replace(/\D/g, '');
    const safeStudents = Array.isArray(students) ? students : [];
    const isDateMode = targetDayOrDate instanceof Date;
    const targetDay = isDateMode ? days[targetDayOrDate.getDay()] : targetDayOrDate;
    const targetDateKey = isDateMode ? formatDateKey(targetDayOrDate) : null;
    const weekRange = scope === 'weekly' ? getWeekRange(targetDayOrDate instanceof Date ? targetDayOrDate : new Date()) : null;

    // 1. 해당 요일에 수업이 있는 학생만 필터링 (정규)
    const dayStudents = safeStudents.filter(s => {
      const schedule = s?.수업스케줄 || s?.["수업 스케줄"] || "";
      const isActive = s?.상태 === "재원"; 
      return schedule.includes(targetDay) && isActive;
    });

    // 2. 보강/체험 데이터 필터링
    const dayExtras = extraSchedules.filter(ex => {
      try {
        if (!ex.날짜) return false;
        const extraDateKey = parseExtraDateKey(ex.날짜);
        if (!extraDateKey) return false;

        // 주간 보기의 경우: 해당 주 범위 내에 들고 요일이 맞는지 체크
        if (scope === 'weekly' && weekRange) {
          const exDate = parseLocalDate(extraDateKey);
          if (!exDate) return false;
          if (exDate < weekRange.start || exDate > weekRange.end) return false;
          return days[exDate.getDay()] === targetDay;
        }

        // 일간 / 월간 보기의 경우: 날짜 키가 정확히 일치하는지 체크
        if (targetDateKey) {
          return extraDateKey === targetDateKey;
        }

        // 기본 백업: 요일만 비교
        const exDate = parseLocalDate(extraDateKey);
        return exDate ? days[exDate.getDay()] === targetDay : false;
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

    // 3. 시간대별 그룹화
    const grouped = combined.reduce((acc, s) => {
      let time = "시간미정";

      if (s.isExtra) {
        const rawTime = String(s.시간 || "");
        const timeMatch = rawTime.match(/(\d{1,2}:\d{2})/);
        time = timeMatch ? timeMatch[0] : "시간미정";
      } else {
        const scheduleStr = s?.수업스케줄 || s?.["수업 스케줄"] || "";
        const daySpecificRegex = new RegExp(`${targetDay}\\s*(\\d{1,2}:\\d{2})`);
        const match = scheduleStr.match(daySpecificRegex);
        
        if (match) {
          time = match[1]; 
        } else {
          const firstTimeMatch = scheduleStr.match(/(\d{1,2}:\d{2})/);
          time = firstTimeMatch ? firstTimeMatch[0] : "시간미정";
        }
      }

      if (time !== "시간미정" && /^\d:\d{2}$/.test(time)) time = "0" + time;

      let isAttended = false;
      if (checkAttendance) {
        // 비교 날짜: targetDateKey가 있으면 해당 날짜(예: "20260702"), 없으면 오늘 날짜
        const compareDateStr = targetDateKey ? targetDateKey.replace(/\D/g, '') : todayStr;

        if (s.isExtra) {
          const matchedStudent = safeStudents.find(student => 
            String(student?.이름).trim() === String(s?.이름).trim()
          );
          if (matchedStudent) {
            const lastAt = String(matchedStudent?.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);
            isAttended = lastAt === compareDateStr;
          }
        } else {
          const lastAt = String(s?.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);
          isAttended = lastAt === compareDateStr;
        }
      }

      if (!acc[time]) acc[time] = [];
      acc[time].push({ ...s, isAttended });
      return acc;
    }, {});

    return Object.keys(grouped).sort().reduce((obj, key) => {
      obj[key] = grouped[key];
      return obj;
    }, {});
  };

  const hasSchedulesOnDay = (targetDay, targetDate = null) => {
    const safeStudents = Array.isArray(students) ? students : [];
    const targetKey = targetDate ? formatDateKey(targetDate) : null;

    const hasRegularSchedule = safeStudents.some((student) => {
      const schedule = student?.수업스케줄 || student?.['수업 스케줄'] || '';
      return schedule.includes(targetDay) && student?.상태 === '재원';
    });

    const hasExtraSchedule = Array.isArray(extraSchedules) && extraSchedules.some((extra) => {
      if (!extra?.날짜) return false;
      const extraDateKey = parseExtraDateKey(extra.날짜);
      if (!extraDateKey) return false;
      if (targetKey) {
        return extraDateKey === targetKey;
      }
      const parsedDate = parseLocalDate(extraDateKey);
      return parsedDate ? days[parsedDate.getDay()] === targetDay : false;
    });

    return hasRegularSchedule || hasExtraSchedule;
  };

  const getMarkedDatesForMonth = (year, month) => {
    const marked = new Set();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let cursor = new Date(firstDay); cursor <= lastDay; cursor.setDate(cursor.getDate() + 1)) {
      const weekday = days[cursor.getDay()];
      if (hasSchedulesOnDay(weekday, cursor)) {
        marked.add(formatDateKey(cursor));
      }
    }

    return marked;
  };

  return (
    <div style={containerStyle}>
      <style>{`
        .react-calendar {
          background: transparent;
          border: none;
          color: #f8fafc;
          width: 100%;
          font-family: inherit;
        }
        .react-calendar__navigation button {
          color: #fff;
          font-weight: 700;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #334155;
        }
        .react-calendar__month-view__weekdays {
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: bold;
        }
        .react-calendar__tile {
          color: #f8fafc;
          border-radius: 10px;
          padding: 12px 0;
          min-height: 48px;
          transition: all 0.2s ease;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background: #334155;
        }
        .react-calendar__tile--active {
          background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
          color: white !important;
        }
        .react-calendar__tile--now {
          border: 1px solid #f59e0b;
          background: #1f2937;
        }
        .react-calendar__tile.has-schedule {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
      `}</style>
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
          <button onClick={() => setViewMode('monthly')} style={viewMode === 'monthly' ? activeTab(isMobile) : inactiveTab(isMobile)}>월간</button>
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
            groupedData={getGroupedData(new Date(), true, 'daily')}
            isMobile={isMobile}
            attendanceStatus={attendanceStatus}
            onCheckIn={handleScheduleAttendance}
          />
        ) : viewMode === 'weekly' ? (
          <WeeklyBoard days={["월", "화", "수", "목", "금", "토"]} getGroupedData={getGroupedData} getDisplayDate={getDisplayDate} isMobile={isMobile} />
        ) : (
          <MonthlyBoard
            selectedDate={selectedDate}
            currentMonth={activeMonth}
            markedDates={getMarkedDatesForMonth(activeMonth.getFullYear(), activeMonth.getMonth())}
            onSelectDate={(date) => {
              // 날짜 클릭 시: selectedDate만 변경 → API 재호출 없음
              setSelectedDate(date);
            }}
            onActiveStartDateChange={({ activeStartDate }) => {
              // 달 이동 시: activeMonth 변경 → useEffect가 새 달 데이터 로드
              if (activeStartDate) setActiveMonth(activeStartDate);
            }}
            groupedData={getGroupedData(selectedDate, true, 'monthly')}
            isLoading={isSyncing}
            isMobile={isMobile}
            dayName={days[selectedDate.getDay()]}
            attendanceStatus={attendanceStatus}
            onCheckIn={handleScheduleAttendance}
          />
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

const WeeklyBoard = ({ days, getGroupedData, getDisplayDate, isMobile }) => {
  // 1. 모든 요일의 데이터를 한 번에 수집
  const allGrouped = {};
  days.forEach(day => {
    allGrouped[day] = getGroupedData(day, false, 'weekly');
  });

  // 2. 모든 요일에 걸쳐 등장하는 시간대를 통합 & 정렬 → 고정 행으로 사용
  const allTimes = Array.from(
    new Set(days.flatMap(day => Object.keys(allGrouped[day])))
  ).sort();

  const colWidth = isMobile ? 120 : 150;
  const timeColWidth = 58;

  return (
    <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
      {/* ── 헤더 행: 빈 시간 칸 + 요일 칸들 ── */}
      <div style={{ display: 'flex', minWidth: timeColWidth + colWidth * days.length }}>
        {/* 시간 열 헤더 */}
        <div style={weeklyTimeColHeader(timeColWidth)} />

        {days.map(day => {
          const date = getDisplayDate(day);
          const totalCount = Object.values(allGrouped[day]).flat().length;
          return (
            <div key={day} style={weeklyDayColHeader(day, colWidth, isMobile)}>
              <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 800 }}>{day}</div>
              <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '1px' }}>{date}</div>
            </div>
          );
        })}
      </div>

      {/* ── 시간대 행들 ── */}
      {allTimes.length === 0 ? (
        <div style={emptyState}>이번 주 수업이 없습니다.</div>
      ) : (
        allTimes.map(time => (
          <div key={time} style={{ display: 'flex', minWidth: timeColWidth + colWidth * days.length, borderBottom: '1px solid #2a2d36' }}>
            {/* 시간 라벨 + 해당 시간대 전체 인원수 */}
            <div style={weeklyTimeCell(timeColWidth)}>
              <div>{time}</div>
            </div>

            {/* 각 요일의 해당 시간대 학생들 */}
            {days.map(day => {
              const members = allGrouped[day][time] || [];
              return (
                <div key={day} style={weeklyDayCell(colWidth)}>
  {members.length === 0 ? (
    <div style={weeklyEmptyCell}>—</div>
  ) : (
    <>
      <div style={weeklyTimeCountBadge}>
        👥 {members.length}명
      </div>

      {members.map((s, i) => (
        <div
          key={i}
          style={s.isExtra ? weeklyExtraChip : weeklyStudentChip}
          title={s.isExtra ? `${s.이름} (${s.유형})` : s.이름}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: isMobile ? '12px' : '13px'
            }}
          >
            {s.이름}
          </span>

          {s.isExtra && (
            <span style={weeklyExtraTag}>
              {s.유형[0]}
            </span>
          )}
        </div>
      ))}
    </>
  )}
</div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

const MonthlyBoard = ({ 
  selectedDate, 
  currentMonth, 
  markedDates, 
  onSelectDate, 
  onActiveStartDateChange, 
  groupedData, 
  isLoading, 
  isMobile, 
  dayName
}) => (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={infoBarStyle(isMobile)}>
      <span>📅 <b>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</b></span>
      <span style={countTagStyle}>{dayName}요일 기준</span>
    </div>

    <div style={calendarCardStyle(isMobile)}>
      <Calendar
        value={selectedDate}
        activeStartDate={currentMonth}
        onChange={onSelectDate}
        onActiveStartDateChange={onActiveStartDateChange}
        locale="ko-KR"
        calendarType="gregory"
        formatDay={(locale, date) => date.getDate()}
        tileClassName={({ date, view }) => 
          (view === 'month' && markedDates.has(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)) 
            ? 'has-schedule' 
            : null
        }
        tileContent={({ date, view }) => 
          view === 'month' && markedDates.has(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`) 
            ? <div style={{ fontSize: '9px', color: '#3b82f6', marginTop: '2px' }}>●</div> 
            : null
        }
      />
    </div>

    <div style={calendarDetailPanelStyle(isMobile)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>{selectedDate.getMonth() + 1}/{selectedDate.getDate()} ({dayName}) 일정</h3>
        <span style={countTagStyle}>총 {Object.values(groupedData).flat().length}명</span>
      </div>

      {isLoading ? (
        <div style={emptyState}>일정을 불러오는 중입니다...</div>
      ) : Object.keys(groupedData).length > 0 ? Object.entries(groupedData).map(([time, members]) => (
        <section key={time} style={timeSectorStyle(isMobile)}>
          <div style={timeIndicatorStyle(isMobile)}>
            {time}
            <div style={timeCountStyle}>{members.length}명</div>
          </div>
          
          <div style={cardGridStyle(isMobile)}>
            {members.map((s, i) => {
              const isExtraClass = s.isExtra;
              const cardStyle = isExtraClass ? extraCard(isMobile) : studentCard(isMobile);
              const badgeText = isExtraClass ? s.유형 : '정규';
              const badgeStyle = isExtraClass ? extraBadge : waitBadge;

              return (
                <div key={i} style={cardStyle}>
                  <div style={badgeStyle}>{badgeText}</div>
                  <div style={nameStyle(isMobile)}>{s.이름 || s.name || '이름 없음'}</div>
                  {/* 💡 출석 관련 버튼 및 UI 제거됨 */}
                </div>
              );
            })}
          </div>
        </section>
      )) : <div style={emptyState}>일정이 없습니다.</div>}
    </div>
  </div>
);

// --- 🎨 스타일 (기존 스타일 유지) ---

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

const attendanceMessageStyle = {
  marginBottom: '16px',
  padding: '12px 16px',
  borderRadius: '12px',
  backgroundColor: '#172554',
  color: '#c7d2fe',
  border: '1px solid #334155',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box'
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
const timeSectorStyle = (isMobile) => ({ backgroundColor: '#24262d', borderRadius: '15px', padding: '15px', marginBottom: '15px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', border: '1px solid #333', width: '100%', boxSizing: 'border-box' });
const timeIndicatorStyle = (isMobile) => ({ minWidth: '70px', fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', borderRight: isMobile ? 'none' : '1px solid #333', borderBottom: isMobile ? '1px solid #333' : 'none', paddingBottom: isMobile ? '8px' : '0' });
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

const emptyState = { textAlign: 'center', padding: '40px', color: '#555', width: '100%' };

// ── 주간 그리드 신규 스타일 ──
const weeklyTimeColHeader = (w) => ({
  width: w,
  minWidth: w,
  flexShrink: 0,
  backgroundColor: '#1e2030',
  borderRight: '1px solid #2a2d36',
  borderBottom: '2px solid #3b82f6',
});

const weeklyDayColHeader = (day, w, isMobile) => ({
  flex: `0 0 ${w}px`,
  minWidth: w,
  padding: isMobile ? '10px 6px' : '12px 8px',
  textAlign: 'center',
  backgroundColor: '#24262d',
  borderRight: '1px solid #2a2d36',
  borderBottom: '2px solid #3b82f6',
  color: '#f8fafc',
  position: 'relative',
});

const weeklyDayCountBadge = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  fontSize: '10px',
  backgroundColor: '#3b82f6',
  color: '#fff',
  padding: '1px 5px',
  borderRadius: '8px',
  fontWeight: 700,
};

const weeklyTimeCell = (w) => ({
  width: w,
  minWidth: w,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 4px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#3b82f6',
  backgroundColor: '#1e2030',
  borderRight: '1px solid #2a2d36',
  gap: '4px',
});



const weeklyDayCell = (w) => ({
  flex: `0 0 ${w}px`,
  minWidth: w,
  padding: '8px 6px',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  borderRight: '1px solid #2a2d36',
  minHeight: '56px',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
});

const weeklyEmptyCell = {
  textAlign: 'center',
  color: '#3a3d4a',
  fontSize: '14px',
};

const weeklyStudentChip = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  padding: '5px 8px',
  borderRadius: '8px',
  backgroundColor: '#2d303a',
  border: '1px solid #3d414d',
  color: '#f1f5f9',
  fontSize: '13px',
  textAlign: 'center',
};

const weeklyExtraChip = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  padding: '5px 8px',
  borderRadius: '8px',
  backgroundColor: '#2d2142',
  border: '1px dashed #8b5cf6',
  color: '#c4b5fd',
  fontSize: '13px',
  textAlign: 'center',
};

const weeklyExtraTag = {
  fontSize: '10px',
  backgroundColor: '#7c3aed',
  color: '#fff',
  padding: '1px 4px',
  borderRadius: '4px',
  fontWeight: 700,
  flexShrink: 0,
};

const weeklyTimeCountBadge = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 8px',
  borderRadius: '8px',
  backgroundColor: '#172554',
  border: '1px solid #3b82f6',
  color: '#bfdbfe',
  fontSize: '13px',
  fontWeight: 700,
  textAlign: 'center',
};

const calendarCardStyle = (isMobile) => ({ 
  background: 'linear-gradient(180deg, rgba(36,38,45,0.98), rgba(31,41,55,0.95))', 
  borderRadius: '20px', 
  padding: '14px', 
  border: '1px solid rgba(59,130,246,0.25)', 
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
  marginBottom: '20px'
});

const calendarDetailPanelStyle = (isMobile) => ({ 
  background: 'linear-gradient(180deg, rgba(36,38,45,0.98), rgba(30,41,59,0.96))', 
  borderRadius: '20px', 
  padding: '20px', 
  border: '1px solid rgba(59,130,246,0.25)', 
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.28)' 
});

export default ScheduleView;