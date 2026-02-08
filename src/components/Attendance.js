import React, { useState, useEffect, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { getStudent, updateStudent } from '../utils/DataHelper';
import { subscribeNFC } from '../utils/InputManager';

function Attendance({ students = [], setStudents }) {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('시스템 대기 중...');
  const [lastStudent, setLastStudent] = useState(null);
  const [isError, setIsError] = useState(false);

  // 📱 모바일 감지 상태
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const processAttendance = useCallback(async (scannedIdOrName) => {
    if (!scannedIdOrName) return;

    const student = getStudent(students, scannedIdOrName);

    // 1. 등록되지 않은 학생
    if (!student) {
      setIsError(true);
      setStatus('⚠️ 등록되지 않은 정보입니다.');
      setInputValue('');
      setTimeout(() => { setStatus('시스템 대기 중...'); setIsError(false); }, 2000);
      return;
    }

    const today = getTodayString();
    const cleanToday = today.replace(/\D/g, '');
    const cleanLastRecord = String(student.마지막출석일 || "").replace(/\D/g, '').substring(0, 8);

    // 2. 중복 출석 처리 (💡 주황색 카드를 띄우도록 수정됨)
    if (cleanLastRecord === cleanToday) {
      setIsError(true);
      setStatus(`⚠️ ${student.이름} 학생은 이미 출석했습니다.`);
      setInputValue('');
      
      // 중복이라도 학생 정보를 카드에 띄움 (isDuplicate 플래그 설정)
      setLastStudent({
        ...student,
        isDuplicate: true 
      });

      setTimeout(() => { 
        setStatus('시스템 대기 중...'); 
        setIsError(false); 
      }, 2500);
      return;
    }

    // 3. 신규 출석 로직
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const fullTimeStr = `${today} ${timeStr}`;
    
    const updatedData = { ...student, 마지막출석일: fullTimeStr, isDuplicate: false };

    setInputValue('');
    setLastStudent(updatedData);
    setStatus('✅ 출석이 완료되었습니다!');
    setIsError(false);

    if (typeof setStudents === 'function') {
      setStudents(prev => updateStudent(prev, updatedData));
    }

    try {
      await requestGAS({
        method: 'POST',
        action: 'checkIn',
        studentId: student.ID,
        studentName: student.이름
      });
    } catch (error) {
      console.error("네트워크 에러:", error);
    }

    setTimeout(() => setStatus('시스템 대기 중...'), 3000);
  }, [students, setStudents]);

  const handleSubmit = (e) => { e.preventDefault(); processAttendance(inputValue); };

  useEffect(() => {
    const unsubscribe = subscribeNFC(processAttendance);
    return () => unsubscribe();
  }, [processAttendance]);

  // --- 🎨 인라인 스타일 객체들 ---

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

  const statusBadgeStyle = {
    display: 'inline-block',
    padding: isMobile ? '6px 15px' : '8px 20px',
    borderRadius: '20px',
    backgroundColor: isError ? '#442727' : status.includes('✅') ? '#1e293b' : '#2d303a',
    color: isError ? '#ff4d4f' : status.includes('✅') ? '#3b82f6' : '#999',
    fontSize: isMobile ? '12px' : '14px',
    fontWeight: '600',
    border: `1px solid ${isError ? '#ff4d4f' : status.includes('✅') ? '#3b82f6' : '#3d414d'}`,
    transition: '0.3s'
  };

  const cardDynamicStyle = {
    display: 'flex', 
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center', 
    backgroundColor: '#24262d', 
    padding: isMobile ? '25px' : '30px', 
    borderRadius: '24px', 
    border: `2px solid ${lastStudent?.isDuplicate ? '#f97316' : '#3b82f6'}`, // 💡 상태별 색상 변경
    boxShadow: lastStudent?.isDuplicate 
      ? '0 15px 35px rgba(249, 115, 22, 0.2)' 
      : '0 15px 35px rgba(59, 130, 246, 0.2)',
    gap: isMobile ? '20px' : '0',
    marginTop: '20px',
    transition: 'all 0.3s ease'
  };

  const avatarDynamicStyle = {
    width: isMobile ? '60px' : '70px', 
    height: isMobile ? '60px' : '70px', 
    backgroundColor: lastStudent?.isDuplicate ? '#f97316' : '#3b82f6', 
    borderRadius: '20px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: isMobile ? '26px' : '30px', 
    fontWeight: '800', 
    color: '#fff', 
    marginRight: isMobile ? '0' : '25px' 
  };

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
        <div style={{ marginBottom: isMobile ? '25px' : '40px' }}>
          <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '800', color: '#fff', marginBottom: '10px' }}>
            스마트 출석 시스템
          </h2>
          <div style={statusBadgeStyle}>
            {status}
          </div>
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
          <p style={{ marginTop: '15px', color: '#555', fontSize: '13px' }}>NFC 태그 또는 정보를 직접 입력하세요.</p>
        </form>

        {lastStudent && (
          <div style={cardDynamicStyle}>
            <div style={avatarDynamicStyle}>
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