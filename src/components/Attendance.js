import React, { useState, useEffect, useCallback, useRef } from 'react'; // 💡 useRef 추가
import { requestGAS } from '../utils/GoogleAppScript';
import { getStudent, updateStudent } from '../utils/DataHelper';
import { subscribeNFC } from '../utils/InputManager';
import StatusBanner from './common/StatusBanner';

function Attendance({ students = [], setStudents }) {
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState({ type: 'info', message: '시스템 대기 중...' });
  const [lastStudent, setLastStudent] = useState(null);
  
  // 💡 타이머를 관리하기 위한 Ref (화면이 바뀌어도 유지됨)
  const timerRef = useRef(null);

  // 📱 모바일 감지
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 💡 정보를 화면에서 지우는 함수
  const clearDisplay = useCallback(() => {
    setLastStudent(null);
    setFeedback({ type: 'info', message: '시스템 대기 중...' });
  }, []);

  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const processAttendance = useCallback(async (scannedIdOrName) => {
    if (!scannedIdOrName) return;

    // 💡 새로운 카드가 찍히면 기존에 예약된 삭제 타이머를 즉시 취소
    if (timerRef.current) clearTimeout(timerRef.current);

    const student = getStudent(students, scannedIdOrName);

    if (!student) {
      setFeedback({ type: 'error', message: '⚠️ 등록되지 않은 정보입니다.' });
      setInputValue('');
      // 에러 메시지도 3초 후 삭제
      timerRef.current = setTimeout(clearDisplay, 3000);
      return;
    }

    const today = getTodayString();
    const cleanToday = today.replace(/\D/g, '');
    const cleanLastRecord = String(student.lastAttendanceDate || student.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);

    // 중복 출석 여부 확인
    const isDuplicate = cleanLastRecord === cleanToday;

    if (isDuplicate) {
      setFeedback({ type: 'error', message: `⚠️ ${student.이름} 학생은 이미 출석했습니다.` });
    } else {
      setFeedback({ type: 'success', message: '✅ 출석이 완료되었습니다!' });
    }

    // 학생 정보 카드 표시
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const displayData = { 
      ...student, 
      lastAttendanceDate: isDuplicate ? student.lastAttendanceDate || student.마지막출석일 : `${today} ${timeStr}`,
      마지막출석일: isDuplicate ? student.lastAttendanceDate || student.마지막출석일 : `${today} ${timeStr}`,
      isDuplicate 
    };

    setLastStudent(displayData);
    setInputValue('');

    // 신규 출석일 경우에만 서버 전송 및 상태 업데이트
    if (!isDuplicate) {
      if (typeof setStudents === 'function') {
        setStudents(prev => updateStudent(prev, displayData));
      }
      try {
        await requestGAS({
          method: 'POST',
          action: 'checkIn',
          studentId: student.id || student.ID,
          studentName: student.name || student.이름
        });
      } catch (error) {
        console.error("네트워크 에러:", error);
      }
    }

    // 💡 5초 후 화면을 깨끗이 비움 (자연스럽게 사라짐)
    timerRef.current = setTimeout(clearDisplay, 5000);

  }, [students, setStudents, clearDisplay]);

  const handleSubmit = (e) => { e.preventDefault(); processAttendance(inputValue); };

  useEffect(() => {
    const unsubscribe = subscribeNFC(processAttendance);
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current); // 컴포넌트 언마운트 시 타이머 제거
    };
  }, [processAttendance]);

  // --- 🎨 스타일링 (이전과 동일하지만 트랜지션 추가) ---

  const containerStyle = {
    width: '100%',
    minHeight: isMobile ? '70vh' : '80vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: isMobile ? 'flex-start' : 'center',
    backgroundColor: '#1a1c23',
    padding: isMobile ? '20px 10px' : '20px',
    boxSizing: 'border-box'
  };

  const cardDynamicStyle = {
    display: 'flex', 
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center', 
    backgroundColor: '#24262d', 
    padding: isMobile ? '25px' : '30px', 
    borderRadius: '24px', 
    border: `2px solid ${lastStudent?.isDuplicate ? '#f97316' : '#3b82f6'}`,
    boxShadow: lastStudent?.isDuplicate 
      ? '0 15px 35px rgba(249, 115, 22, 0.2)' 
      : '0 15px 35px rgba(59, 130, 246, 0.2)',
    gap: isMobile ? '20px' : '0',
    marginTop: '20px',
    transition: 'opacity 0.5s ease, transform 0.5s ease', // 💡 부드럽게 나타나고 사라짐
    opacity: lastStudent ? 1 : 0,
    transform: lastStudent ? 'translateY(0)' : 'translateY(20px)'
  };

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
        <div style={{ marginBottom: isMobile ? '25px' : '40px' }}>
          <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '800', color: '#fff', marginBottom: '10px' }}>
            스마트 출석 시스템
          </h2>
          <StatusBanner
            type={feedback.type}
            message={feedback.message}
            style={{ display: 'inline-block', padding: isMobile ? '6px 15px' : '8px 20px', borderRadius: '20px' }}
          />
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: isMobile ? '30px' : '50px' }}>
          <div style={{
            display: 'flex', gap: '10px', backgroundColor: '#24262d', padding: isMobile ? '8px' : '10px',
            borderRadius: '16px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <input
              type="text"
              placeholder={isMobile ? "이름/ID 입력" : "이름 또는 ID를 입력하세요"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '10px 5px', fontSize: isMobile ? '16px' : '18px', outline: 'none' }}
              autoFocus
            />
            <button type="submit" style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: isMobile ? '10px 15px' : '10px 25px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
              확인
            </button>
          </div>
        </form>

        {lastStudent && (
          <div style={cardDynamicStyle}>
            <div style={{
              width: isMobile ? '60px' : '70px', height: isMobile ? '60px' : '70px',
              backgroundColor: lastStudent.isDuplicate ? '#f97316' : '#3b82f6',
              borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? '26px' : '30px', fontWeight: '800', color: '#fff', marginRight: isMobile ? '0' : '25px'
            }}>
              {lastStudent.이름[0]}
            </div>
            <div style={{ textAlign: isMobile ? 'center' : 'left', flex: 1 }}>
              <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '700', color: '#fff', marginBottom: '15px' }}>
                {lastStudent.isDuplicate ? (
                  <span style={{ color: '#f97316' }}>⚠️ 이미 출석 완료: {lastStudent.이름}</span>
                ) : (
                  <>어서오세요, <span style={{ color: '#3b82f6' }}>{lastStudent.이름}</span> 학생!</>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#71717a', fontWeight: '600' }}>출석 시간</span>
                  <span style={{ fontSize: '16px', color: '#eee', fontWeight: '700' }}>
                    {lastStudent.마지막출석일 ? lastStudent.마지막출석일.split(' ')[1] : '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#71717a', fontWeight: '600' }}>보유 포인트</span>
                  <span style={{ fontSize: '16px', color: lastStudent.isDuplicate ? '#f97316' : '#3b82f6', fontWeight: '800' }}>
                    {Number(lastStudent.포인트 || 0).toLocaleString()} P
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance;