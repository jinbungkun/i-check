import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';

function Register({ setStudents }) {
  const [formData, setFormData] = useState({
    이름: '',
    ID: '',
    수업스케줄: '',
    본인전화번호: '',
    학부모전화번호: '',
    포인트: '0'
  });

  // 스케줄 선택을 위한 임시 상태
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const days = ["월", "화", "수", "목", "금", "토", "일"];

  // 폼 입력값 변경
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 📅 스케줄 추가 로직 (버튼 클릭 시 형식에 맞춰 추가)
  const addSchedule = () => {
    if (!selectedDay) {
      alert("요일을 선택해주세요!");
      return;
    }
    const newSchedule = `${selectedDay}(${selectedTime})`;
    const currentSchedules = formData.수업스케줄 ? formData.수업스케줄.split(', ') : [];
    
    if (currentSchedules.includes(newSchedule)) return; // 중복 방지

    setFormData(prev => ({
      ...prev,
      수업스케줄: [...currentSchedules, newSchedule].join(', ')
    }));
  };

  // 💳 NFC 태그 시 ID만 조용히 입력 (알림 제거)
  const handleNFCTag = useCallback((scannedId) => {
    setFormData(prev => ({ ...prev, ID: scannedId }));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNFC(handleNFCTag);
    return () => unsubscribe();
  }, [handleNFCTag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.이름 || !formData.ID) {
      setStatus({ type: 'error', msg: '⚠️ 이름과 ID는 필수입니다.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await requestGAS({ method: 'POST', action: 'registerStudent', studentData: formData });
      if (response.status === "success") {
        setStatus({ type: 'success', msg: `✅ ${formData.이름} 등록 완료!` });
        if (setStudents) setStudents(prev => [...prev, { ...formData, 마지막출석일: '' }]);
        setFormData({ 이름: '', ID: '', 수업스케줄: '', 본인전화번호: '', 학부모전화번호: '', 포인트: '0' });
      }
    } catch (e) { setStatus({ type: 'error', msg: '❌ 에러 발생' }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <header style={headerStyle}>
          <h2 style={titleStyle}>신규 학생 등록</h2>
        </header>

        {status.msg && <div style={statusBanner(status.type)}>{status.msg}</div>}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGrid}>
            <div style={inputGroup}>
              <label style={labelStyle}>학생 이름 *</label>
              <input name="이름" value={formData.이름} onChange={handleChange} style={inputStyle} placeholder="이름 입력" />
            </div>
            
            <div style={inputGroup}>
              <label style={labelStyle}>NFC ID (카드번호) *</label>
              <input name="ID" value={formData.ID} onChange={handleChange} style={{...inputStyle, borderColor: formData.ID ? '#3b82f6' : '#3d414d'}} placeholder="카드를 찍어주세요" />
            </div>

            {/* 🕒 수업 스케줄 선택기 UI */}
            <div style={{...inputGroup, gridColumn: 'span 2'}}>
              <label style={labelStyle}>수업 스케줄 설정</label>
              <div style={selectorContainer}>
                <div style={dayButtonGroup}>
                  {days.map(d => (
                    <button key={d} type="button" 
                      onClick={() => setSelectedDay(d)}
                      style={selectedDay === d ? dayBtnActive : dayBtn}>
                      {d}
                    </button>
                  ))}
                </div>
                <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} style={timeInputStyle} />
                <button type="button" onClick={addSchedule} style={addBtnStyle}>추가</button>
              </div>
              
              {/* 추가된 스케줄 확인란 */}
              <div style={scheduleResultTagBox}>
                {formData.수업스케줄 ? formData.수업스케줄.split(', ').map((s, i) => (
                  <span key={i} style={scheduleTag}>
                    {s} 
                    <span style={{marginLeft: '8px', cursor: 'pointer'}} onClick={() => {
                      const filtered = formData.수업스케줄.split(', ').filter(item => item !== s).join(', ');
                      setFormData(prev => ({...prev, 수업스케줄: filtered}));
                    }}>×</span>
                  </span>
                )) : <span style={{color: '#555', fontSize: '13px'}}>등록된 스케줄이 없습니다. 요일과 시간을 선택 후 추가를 눌러주세요.</span>}
              </div>
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>본인 연락처</label>
              <input name="본인전화번호" value={formData.본인전화번호} onChange={handleChange} style={inputStyle} placeholder="010-0000-0000" />
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>학부모 연락처</label>
              <input name="학부모전화번호" value={formData.학부모전화번호} onChange={handleChange} style={inputStyle} placeholder="010-0000-0000" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} style={isSubmitting ? disabledBtn : submitBtn}>
            {isSubmitting ? '등록 중...' : '학생 등록 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- 추가/수정된 스타일 ---
const selectorContainer = { display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#1a1c23', padding: '15px', borderRadius: '12px', border: '1px solid #333' };
const dayButtonGroup = { display: 'flex', gap: '5px' };
const dayBtn = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #3d414d', backgroundColor: '#24262d', color: '#999', cursor: 'pointer', fontWeight: 'bold' };
const dayBtnActive = { ...dayBtn, backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' };
const timeInputStyle = { backgroundColor: '#24262d', border: '1px solid #3d414d', color: '#fff', padding: '7px', borderRadius: '8px', outline: 'none' };
const addBtnStyle = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' };
const scheduleResultTagBox = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px', minHeight: '30px' };
const scheduleTag = { backgroundColor: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f6', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' };

// (기존 스타일 유지)
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', padding: '40px 5%', display: 'flex', justifyContent: 'center' };
const cardStyle = { width: '100%', maxWidth: '800px', backgroundColor: '#24262d', borderRadius: '24px', padding: '40px', border: '1px solid #333' };
const headerStyle = { marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' };
const titleStyle = { fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0 };
const statusBanner = (type) => ({ padding: '15px', borderRadius: '10px', marginBottom: '20px', backgroundColor: type === 'success' ? '#1e293b' : '#442727', color: type === 'success' ? '#3b82f6' : '#ff4d4f', border: `1px solid ${type === 'success' ? '#3b82f6' : '#ff4d4f'}` });
const formStyle = { display: 'flex', flexDirection: 'column', gap: '25px' };
const inputGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '13px', fontWeight: '700', color: '#3b82f6' };
const inputStyle = { backgroundColor: '#1a1c23', border: '1px solid #3d414d', borderRadius: '10px', padding: '12px', color: '#fff', outline: 'none' };
const submitBtn = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' };
const disabledBtn = { ...submitBtn, backgroundColor: '#333', color: '#777' };

export default Register;