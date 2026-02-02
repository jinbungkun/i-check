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

  const handleSearch = async (searchId) => {
    const target = (searchId || query).trim();
    if (!target) return;

    const found = students.find(s => 
      String(s.이름 || '').trim() === target || String(s.ID || '').trim() === target
    );

    if (found) {
      setSelectedStudent(found); 
      setIsReplacing(false);
      setAttendanceDates([]); 
      setIsLoadingLogs(true);

      try {
        const response = await requestGAS({
          method: 'GET',
          action: 'getLogs',
          studentId: found.ID
        });

        console.log("📥 GAS 원본 데이터:", response); 

        // 어떤 형태의 응답이든 배열을 안전하게 추출
        let rawLogs = [];
        if (Array.isArray(response)) {
          rawLogs = response;
        } else if (response && typeof response === 'object') {
          rawLogs = response.data || Object.values(response).find(Array.isArray) || [];
        }

        const cleanDates = rawLogs.map(log => {
          const match = String(log).match(/(\d{4}-\d{2}-\d{2})/);
          return match ? match[1] : null;
        }).filter(Boolean);
        
        const uniqueDates = [...new Set(cleanDates)];
        console.log("✅ 최종 매칭 데이터:", uniqueDates); 
        setAttendanceDates(uniqueDates);

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
        if (!window.confirm(`${selectedStudent.이름} 학생의 카드를 새 번호로 교체할까요?`)) {
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
          if (res.status === "success") {
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
  }, [isReplacing, selectedStudent, students]);

  return (
    <div style={containerStyle}>
      <style>{`
        /* 1. 출석일 기본 스타일 (가장 높은 우선순위) */
        .react-calendar__tile.attended-day {
          background-color: #10b981 !important; /* 초록색 */
          color: white !important;
          border-radius: 12px !important;
          font-weight: bold !important;
        }

        /* 2. 오늘 날짜 스타일 (노란색 배경 제거하고 테두리로 변경) */
        .react-calendar__tile--now {
          background-color: #3d414d !important; /* 기본 배경색과 맞춤 */
          border: 2px solid #facc15 !important; /* 오늘임을 알리는 노란 테두리 */
          color: #facc15 !important;
        }

        /* 3. 오늘이면서 출석도 한 경우 (초록 배경 유지 + 노란 테두리) */
        .react-calendar__tile--now.attended-day {
          background-color: #10b981 !important;
          color: white !important;
          border: 3px solid #fef08a !important; /* 초록 배경 위 노란 테두리 */
        }

        /* 4. 마우스 올렸을 때 */
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #4b5563 !important;
        }

        ${calendarCustomStyle}
      `}</style>

      <header style={headerStyle}>
        <h2 style={titleStyle}>학생 이력 조회</h2>
        <div style={searchBarContainer}>
          <input 
            style={searchInputStyle} 
            placeholder="이름 또는 ID 입력" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
          />
          <button style={searchButtonStyle} onClick={() => handleSearch()}>검색</button>
        </div>
      </header>

      {selectedStudent ? (
        <div style={dashboardGrid}>
          <div style={profileCardStyle}>
            <div style={avatarLarge}>{selectedStudent.이름 ? selectedStudent.이름[0] : '?'}</div>
            <h3 style={profileName}>{selectedStudent.이름}</h3>
            <span style={idBadge}>ID: {selectedStudent.ID}</span>
            <div style={infoList}>
              <div style={infoItem}><span style={infoLabel}>보유 포인트</span><span style={infoValuePrimary}>{Number(selectedStudent.포인트 || 0).toLocaleString()} P</span></div>
              <div style={infoItem}><span style={infoLabel}>학부모 연락처</span><span style={infoValue}>{selectedStudent.학부모전화번호 || '-'}</span></div>
              <div style={infoItem}><span style={infoLabel}>본인 연락처</span><span style={infoValue}>{selectedStudent.본인전화번호 || '-'}</span></div>
              <div style={infoItem}><span style={infoLabel}>생년월일</span><span style={infoValue}>{selectedStudent.생년월일 || '-'}</span></div>
              <div style={infoItem}><span style={infoLabel}>수업 스케줄</span><span style={{...infoValue, fontSize: '13px'}}>{selectedStudent.수업스케줄 || '-'}</span></div>
            </div>
            <hr style={dividerStyle} />
            {!isReplacing ? (
              <button style={replaceBtnStyle} onClick={() => setIsReplacing(true)}>🔁 카드 분실/교체</button>
            ) : (
              <div style={replaceActiveBox}>
                <div className="pulse-icon">📡</div>
                <p style={{margin: '10px 0', fontSize: '14px', color: '#3b82f6', fontWeight: 'bold'}}>새 카드를 리더기에 찍어주세요</p>
                <button style={cancelBtnStyle} onClick={() => setIsReplacing(false)}>취소</button>
              </div>
            )}
          </div>

          <div style={calendarPanelStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h4 style={panelTitle}>출석 히스토리</h4>
              {isLoadingLogs && <span style={loadingTextStyle}>조회 중...</span>}
            </div>
            
            <div style={calendarWrapper}>
              <Calendar 
                key={attendanceDates.join(',')} 
                locale="ko-KR" 
                calendarType="gregory" 
                formatDay={(l, d) => d.getDate()}
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    const calendarDateStr = `${y}-${m}-${d}`; 
                    if (attendanceDates.includes(calendarDateStr)) return 'attended-day';
                  }
                  return null;
                }}
              />
            </div>
            <p style={noticeStyle}>* 초록색으로 강조된 날짜는 출석 기록이 있는 날입니다.</p>
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle}>학생을 검색하거나 카드를 태그해주세요.</div>
      )}
    </div>
  );
}

const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };
const headerStyle = { padding: '30px 5%', borderBottom: '1px solid #333', backgroundColor: '#24262d' };
const titleStyle = { margin: '0 0 20px 0', fontSize: '24px', fontWeight: '800' };
const searchBarContainer = { display: 'flex', gap: '10px', maxWidth: '500px' };
const searchInputStyle = { flex: 1, backgroundColor: '#1a1c23', border: '1px solid #3d414d', borderRadius: '12px', padding: '12px 20px', color: '#fff', outline: 'none' };
const searchButtonStyle = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 25px', fontWeight: '700', cursor: 'pointer' };
const dashboardGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', padding: '30px 5%' };
const profileCardStyle = { backgroundColor: '#24262d', borderRadius: '24px', padding: '40px 30px', textAlign: 'center', border: '1px solid #333' };
const avatarLarge = { width: '80px', height: '80px', backgroundColor: '#3b82f6', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', margin: '0 auto 20px' };
const profileName = { fontSize: '24px', fontWeight: '800', margin: '0 0 10px 0' };
const idBadge = { backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', color: '#999' };
const infoList = { marginTop: '30px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' };
const infoItem = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d303a', paddingBottom: '8px' };
const infoLabel = { color: '#71717a', fontSize: '14px' };
const infoValue = { color: '#eee', fontSize: '15px', fontWeight: '700' };
const infoValuePrimary = { color: '#3b82f6', fontSize: '16px', fontWeight: '800' };
const dividerStyle = { border: 'none', borderTop: '1px solid #333', margin: '30px 0' };
const replaceBtnStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #3b82f6', backgroundColor: 'transparent', color: '#3b82f6', fontWeight: '700', cursor: 'pointer' };
const replaceActiveBox = { padding: '20px', backgroundColor: '#1e293b', borderRadius: '16px', border: '2px dashed #3b82f6' };
const cancelBtnStyle = { backgroundColor: '#333', color: '#999', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' };
const calendarPanelStyle = { backgroundColor: '#24262d', borderRadius: '24px', padding: '30px', border: '1px solid #333' };
const panelTitle = { fontSize: '18px', fontWeight: '700', color: '#3b82f6' };
const loadingTextStyle = { color: '#10b981', fontSize: '14px', fontWeight: 'bold' };
const calendarWrapper = { backgroundColor: '#1a1c23', borderRadius: '16px', padding: '15px', border: '1px solid #333' };
const noticeStyle = { marginTop: '15px', color: '#71717a', fontSize: '12px', textAlign: 'center' };
const emptyStateStyle = { textAlign: 'center', padding: '100px 5%', color: '#555', fontSize: '18px' };

const calendarCustomStyle = `
  .react-calendar { width: 100%; background: transparent; border: none; color: #fff; font-family: inherit; }
  .react-calendar__navigation button { color: #3b82f6; font-size: 18px; }
  .react-calendar__tile { height: 60px; color: #eee; border-radius: 12px; margin: 2px 0; }
  .pulse-icon { font-size: 24px; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
`;

export default Search;