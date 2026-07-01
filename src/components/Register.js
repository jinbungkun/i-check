import React, { useState, useEffect, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';
import StatusBanner from './common/StatusBanner';

function Register({ students, setStudents, headers = [] }) {
  const [formData, setFormData] = useState({});
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // 📱 화면 너비 감지 (반응형 대응)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const excludeFields = ['포인트', '상태', '마지막 출석일'];
  const manualFields = ['이름', 'ID', '수업 스케줄', '본인 전화번호', '학부모 전화번호', '생년월일'];

  useEffect(() => {
    if (headers.length > 0) {
      const initialData = {};
      headers.forEach(h => {
        if (!excludeFields.includes(h)) initialData[h] = '';
      });
      setFormData(prev => ({ ...initialData, ...prev }));
    }
  }, [headers, excludeFields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addSchedule = () => {
    if (!selectedDay) { alert("요일을 선택해주세요!"); return; }
    const newSchedule = `${selectedDay}${selectedTime}`;
    const currentSchedules = formData['수업 스케줄'] ? formData['수업 스케줄'].split(', ') : [];
    if (currentSchedules.includes(newSchedule)) return;

    setFormData(prev => ({
      ...prev,
      '수업 스케줄': [...currentSchedules, newSchedule].join(', ')
    }));
  };

  const handleNFCTag = useCallback((scannedId) => {
    setFormData(prev => ({ ...prev, ID: scannedId }));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNFC(handleNFCTag);
    return () => unsubscribe();
  }, [handleNFCTag]);

  // 💡 수정된 handleSubmit 함수
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. 필수 입력값 검사
    if (!formData.이름 || !formData.ID) {
      setStatus({ type: 'error', msg: '⚠️ 이름과 ID는 필수입니다.' });
      return;
    }

    // 2. 💡 등록 확인 알림창 추가
    const confirmMsg = `
[등록 정보 확인]
이름: ${formData.이름}
NFC ID: ${formData.ID}
스케줄: ${formData['수업 스케줄'] || '없음'}

이 정보로 신규 등록하시겠습니까?`;

    if (!window.confirm(confirmMsg)) {
      return; // '취소'를 누르면 여기서 중단
    }

    if (students && students.some(s => s.ID === formData.ID)) {
      setStatus({ type: 'error', msg: '⚠️ 이미 등록된 ID입니다.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'loading', msg: '등록 요청을 보내는 중입니다...' });
    try {
      const studentDataForGAS = {};
      Object.keys(formData).forEach(key => {
        const cleanKey = key.replace(/\s+/g, "");
        studentDataForGAS[cleanKey] = formData[key];
      });

      const response = await requestGAS({ 
        method: 'POST', 
        action: 'registerStudent', 
        studentData: studentDataForGAS 
      });
      
      if (response?.ok) {
        setStatus({ type: 'success', msg: `✅ ${formData.이름} 등록 완료!` });
        if (setStudents) setStudents(prev => [...prev, { ...formData, 마지막출석일: '' }]);
        
        // 입력 폼 초기화
        const resetData = {};
        headers.forEach(h => { if (!excludeFields.includes(h)) resetData[h] = ''; });
        setFormData(resetData);
      }
    } catch (e) { 
      setStatus({ type: 'error', msg: '❌ 서버 통신 에러가 발생했습니다.' }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // --- 스타일 정의 부분 (기존과 동일) ---
  return (
    <div style={containerStyle(isMobile)}>
      <div style={cardStyle(isMobile)}>
        <header style={headerStyle}>
          <h2 style={titleStyle(isMobile)}>신규 학생 등록</h2>
        </header>

        {status.msg && <StatusBanner type={status.type || 'info'} message={status.msg} style={{ marginBottom: '20px' }} />}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGrid(isMobile)}>
            <div style={inputGroup}>
              <label style={labelStyle}>학생 이름 *</label>
              <input name="이름" value={formData.이름 || ''} onChange={handleChange} style={inputStyle} placeholder="이름 입력" />
            </div>
            
            <div style={inputGroup}>
              <label style={labelStyle}>NFC ID (카드번호) *</label>
              <input name="ID" value={formData.ID || ''} onChange={handleChange} style={{...inputStyle, borderColor: formData.ID ? '#3b82f6' : '#3d414d'}} placeholder="카드를 찍어주세요" />
            </div>

            <div style={{...inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2'}}>
              <label style={labelStyle}>수업 스케줄 설정</label>
              <div style={selectorContainer(isMobile)}>
                <div style={dayButtonGroup(isMobile)}>
                  {days.map(d => (
                    <button key={d} type="button" 
                      onClick={() => setSelectedDay(d)}
                      style={selectedDay === d ? dayBtnActive : dayBtn(isMobile)}>
                      {d}
                    </button>
                  ))}
                </div>
                <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                   <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} style={{...timeInputStyle, flex: 1}} />
                   <button type="button" onClick={addSchedule} style={addBtnStyle}>추가</button>
                </div>
              </div>
              <div style={scheduleResultTagBox}>
                {formData['수업 스케줄'] ? formData['수업 스케줄'].split(', ').map((s, i) => (
                  <span key={i} style={scheduleTag}>
                    {s} <span style={{marginLeft: '8px', cursor: 'pointer'}} onClick={() => {
                      const filtered = formData['수업 스케줄'].split(', ').filter(item => item !== s).join(', ');
                      setFormData(prev => ({...prev, '수업 스케줄': filtered}));
                    }}>×</span>
                  </span>
                )) : <span style={{color: '#555', fontSize: '13px'}}>등록된 스케줄이 없습니다.</span>}
              </div>
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>본인 전화번호</label>
              <input name="본인 전화번호" value={formData['본인 전화번호'] || ''} onChange={handleChange} style={inputStyle} placeholder="010-0000-0000" />
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>학부모 전화번호</label>
              <input name="학부모 전화번호" value={formData['학부모 전화번호'] || ''} onChange={handleChange} style={inputStyle} placeholder="010-0000-0000" />
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>생년월일</label>
              <input type="date" name="생년월일" value={formData.생년월일 || ''} onChange={handleChange} style={{...inputStyle, colorScheme: 'dark'}} />
            </div>

            {headers.map(header => {
              if (excludeFields.includes(header) || manualFields.includes(header)) return null;
              return (
                <div key={header} style={inputGroup}>
                  <label style={labelStyle}>{header}</label>
                  <input name={header} value={formData[header] || ''} onChange={handleChange} style={inputStyle} placeholder={`${header} 입력`} />
                </div>
              );
            })}
          </div>

          <button type="submit" disabled={isSubmitting} style={isSubmitting ? disabledBtn : submitBtn}>
            {isSubmitting ? '등록 중...' : '학생 등록 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}

// 🎨 스타일 코드 (변경 없음)
const containerStyle = (isMobile) => ({ width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', padding: isMobile ? '10px' : '40px 5%', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' });
const cardStyle = (isMobile) => ({ width: '100%', maxWidth: '800px', backgroundColor: '#24262d', borderRadius: isMobile ? '16px' : '24px', padding: isMobile ? '20px' : '40px', border: '1px solid #333', boxSizing: 'border-box' });
const titleStyle = (isMobile) => ({ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', color: '#fff', margin: 0 });
const inputGrid = (isMobile) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '15px' : '20px' });
const selectorContainer = (isMobile) => ({ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center', backgroundColor: '#1a1c23', padding: '12px', borderRadius: '12px', border: '1px solid #333' });
const dayButtonGroup = (isMobile) => ({ display: 'flex', gap: '4px', justifyContent: 'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap' });
const dayBtn = (isMobile) => ({ flex: 1, minWidth: isMobile ? '40px' : 'auto', padding: '8px', borderRadius: '8px', border: '1px solid #3d414d', backgroundColor: '#24262d', color: '#999', cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px' });
const dayBtnActive = { ...dayBtn(false), backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6', flex: 1 };
const headerStyle = { marginBottom: '25px', borderBottom: '1px solid #333', paddingBottom: '15px' };
const statusBanner = (type) => ({ padding: '15px', borderRadius: '10px', marginBottom: '20px', backgroundColor: type === 'success' ? '#1e293b' : '#442727', color: type === 'success' ? '#3b82f6' : '#ff4d4f', border: `1px solid ${type === 'success' ? '#3b82f6' : '#ff4d4f'}`, fontSize: '14px' });
const formStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '13px', fontWeight: '700', color: '#3b82f6' };
const inputStyle = { backgroundColor: '#1a1c23', border: '1px solid #3d414d', borderRadius: '10px', padding: '14px', color: '#fff', outline: 'none', fontSize: '16px' };
const timeInputStyle = { backgroundColor: '#24262d', border: '1px solid #3d414d', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' };
const addBtnStyle = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' };
const scheduleResultTagBox = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' };
const scheduleTag = { backgroundColor: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f6', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' };
const submitBtn = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' };
const disabledBtn = { ...submitBtn, backgroundColor: '#333', color: '#777' };

export default Register;