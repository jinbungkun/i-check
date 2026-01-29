import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme';
import { requestGAS } from '../utils/GoogleAppScript';
import { getStudent, updateStudent } from '../utils/DataHelper';
import { subscribeNFC } from '../utils/InputManager';

function Attendance({ students = [], setStudents }) {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState('시스템 대기 중...');
  const [lastStudent, setLastStudent] = useState(null);
  const [isError, setIsError] = useState(false);

  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const processAttendance = useCallback(async (scannedIdOrName) => {
    if (!scannedIdOrName) return;

    const student = getStudent(students, scannedIdOrName);

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

    if (cleanLastRecord === cleanToday) {
      setIsError(true);
      setStatus(`⚠️ ${student.이름} 학생은 이미 출석했습니다.`);
      setInputValue('');
      setTimeout(() => { setStatus('시스템 대기 중...'); setIsError(false); }, 2500);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const fullTimeStr = `${today} ${timeStr}`;
    
    const updatedData = { ...student, 마지막출석일: fullTimeStr };

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

  return (
    <div style={containerStyle}>
      <div style={contentWrapper}>
        <div style={headerSection}>
          <h2 style={titleStyle}>스마트 출석 시스템</h2>
          <div style={statusBadge(isError, status.includes('✅'))}>
            {status}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputContainer}>
            <input
              type="text"
              placeholder="이름 또는 ID를 입력하세요"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            <button type="submit" style={buttonStyle}>확인</button>
          </div>
          <p style={hintStyle}>NFC 카드를 태그하거나 정보를 입력 후 엔터를 누르세요.</p>
        </form>

        {lastStudent && (
          <div style={resultCardStyle}>
            <div style={avatarStyle}>{lastStudent.이름[0]}</div>
            <div style={infoContent}>
              <div style={welcomeText}>어서오세요, <span style={highlight}>{lastStudent.이름}</span> 학생!</div>
              <div style={detailGrid}>
                <div style={detailItem}>
                  <span style={label}>출석 시간</span>
                  <span style={value}>{lastStudent.마지막출석일.split(' ')[1]}</span>
                </div>
                <div style={detailItem}>
                  <span style={label}>보유 포인트</span>
                  <span style={valuePrimary}>{Number(lastStudent.포인트 || 0).toLocaleString()} P</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 스타일링 (프리미엄 다크 테마) ---
const containerStyle = { width: '100%', minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1c23', padding: '20px' };
const contentWrapper = { width: '100%', maxWidth: '600px', textAlign: 'center' };
const headerSection = { marginBottom: '40px' };
const titleStyle = { fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '15px' };

const statusBadge = (isError, isSuccess) => ({
  display: 'inline-block',
  padding: '8px 20px',
  borderRadius: '20px',
  backgroundColor: isError ? '#442727' : isSuccess ? '#1e293b' : '#2d303a',
  color: isError ? '#ff4d4f' : isSuccess ? '#3b82f6' : '#999',
  fontSize: '14px',
  fontWeight: '600',
  border: `1px solid ${isError ? '#ff4d4f' : isSuccess ? '#3b82f6' : '#3d414d'}`,
  transition: '0.3s'
});

const formStyle = { marginBottom: '50px' };
const inputContainer = { display: 'flex', gap: '10px', backgroundColor: '#24262d', padding: '10px', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' };
const inputStyle = { flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '10px 15px', fontSize: '18px', outline: 'none' };
const buttonStyle = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' };
const hintStyle = { marginTop: '15px', color: '#555', fontSize: '13px' };

const resultCardStyle = { 
  display: 'flex', alignItems: 'center', backgroundColor: '#24262d', padding: '30px', borderRadius: '24px', border: '1px solid #3b82f6', 
  boxShadow: '0 15px 35px rgba(59, 130, 246, 0.2)', animation: 'slideUp 0.5s ease' 
};
const avatarStyle = { width: '70px', height: '70px', backgroundColor: '#3b82f6', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: '800', color: '#fff', marginRight: '25px' };
const infoContent = { textAlign: 'left', flex: 1 };
const welcomeText = { fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '15px' };
const highlight = { color: '#3b82f6' };
const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const detailItem = { display: 'flex', flexDirection: 'column', gap: '5px' };
const label = { fontSize: '12px', color: '#71717a', fontWeight: '600' };
const value = { fontSize: '16px', color: '#eee', fontWeight: '700' };
const valuePrimary = { fontSize: '16px', color: '#3b82f6', fontWeight: '800' };

export default Attendance;