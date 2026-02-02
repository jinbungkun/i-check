import React, { useState, useEffect, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';

function Register({ setStudents, headers = [] }) {
  const [formData, setFormData] = useState({});
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const days = ["월", "화", "수", "목", "금", "토", "일"];

  // 💡 제외 항목 (포인트, 상태, 마지막 출석일)
  const excludeFields = ['포인트', '상태', '마지막 출석일'];
  
  // 💡 엑셀 헤더와 100% 일치시켜 중복 방지
  const manualFields = ['이름', 'ID', '수업 스케줄', '본인 전화번호', '학부모 전화번호', '생년월일'];

  useEffect(() => {
    if (headers.length > 0) {
      const initialData = {};
      headers.forEach(h => {
        if (!excludeFields.includes(h)) {
          initialData[h] = '';
        }
      });
      setFormData(prev => ({ ...initialData, ...prev }));
    }
  }, [headers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addSchedule = () => {
    if (!selectedDay) { alert("요일을 선택해주세요!"); return; }
    const newSchedule = `${selectedDay}(${selectedTime})`;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.이름 || !formData.ID) {
      setStatus({ type: 'error', msg: '⚠️ 이름과 ID는 필수입니다.' });
      return;
    }
    setIsSubmitting(true);
    try {
      // GAS 전송 시 공백 제거 처리
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
      
      if (response.status === "success") {
        setStatus({ type: 'success', msg: `✅ ${formData.이름} 등록 완료!` });
        if (setStudents) setStudents(prev => [...prev, { ...formData, 마지막출석일: '' }]);
        
        const resetData = {};
        headers.forEach(h => { if (!excludeFields.includes(h)) resetData[h] = ''; });
        setFormData(resetData);
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
            {/* 기본 정보 */}
            <div style={inputGroup}>
              <label style={labelStyle}>학생 이름 *</label>
              <input name="이름" value={formData.이름 || ''} onChange={handleChange} style={inputStyle} placeholder="이름 입력" />
            </div>
            
            <div style={inputGroup}>
              <label style={labelStyle}>NFC ID (카드번호) *</label>
              <input name="ID" value={formData.ID || ''} onChange={handleChange} style={{...inputStyle, borderColor: formData.ID ? '#3b82f6' : '#3d414d'}} placeholder="카드를 찍어주세요" />
            </div>

            {/* 수업 스케줄 (기존 UI 유지) */}
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

            {/* 연락처 */}
            <div style={inputGroup}>
              <label style={labelStyle}>본인 전화번호</label>
              <input name="본인 전화번호" value={formData['본인 전화번호'] || ''} onChange={handleChange} style={inputStyle} placeholder="010-0000-0000" />
            </div>

            <div style={inputGroup}>
              <label style={labelStyle}>학부모 전화번호</label>
              <input name="학부모 전화번호" value={formData['학부모 전화번호'] || ''} onChange={handleChange} style={inputStyle} placeholder="010-0000-0000" />
            </div>

            {/* 📅 생년월일 날짜 선택기 (수정 포인트) */}
            <div style={inputGroup}>
              <label style={labelStyle}>생년월일</label>
              <input 
                type="date"
                name="생년월일" 
                value={formData.생년월일 || ''} 
                onChange={handleChange} 
                style={{...inputStyle, colorScheme: 'dark'}} 
              />
            </div>

            {/* 자동 생성 섹션 (추가 카테고리) */}
            {headers.map(header => {
              if (excludeFields.includes(header) || manualFields.includes(header)) return null;
              return (
                <div key={header} style={inputGroup}>
                  <label style={labelStyle}>{header}</label>
                  <input 
                    name={header} 
                    value={formData[header] || ''} 
                    onChange={handleChange} 
                    style={inputStyle} 
                    placeholder={`${header} 입력`} 
                  />
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

// 스타일 코드
const selectorContainer = { display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#1a1c23', padding: '15px', borderRadius: '12px', border: '1px solid #333' };
const dayButtonGroup = { display: 'flex', gap: '5px' };
const dayBtn = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #3d414d', backgroundColor: '#24262d', color: '#999', cursor: 'pointer', fontWeight: 'bold' };
const dayBtnActive = { ...dayBtn, backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' };
const timeInputStyle = { backgroundColor: '#24262d', border: '1px solid #3d414d', color: '#fff', padding: '7px', borderRadius: '8px', outline: 'none' };
const addBtnStyle = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' };
const scheduleResultTagBox = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px', minHeight: '30px' };
const scheduleTag = { backgroundColor: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f6', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' };
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