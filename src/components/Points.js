import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';

function Points({ students, setStudents }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointAmount, setPointAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const quickPoints = [100, 300, 500];

  const handleSearch = useCallback((searchId) => {
    const target = (searchId || query).trim();
    if (!target) return;

    const found = students.find(s => 
      String(s.이름 || '').trim() === target || String(s.ID || '').trim() === target
    );

    if (found) {
      setSelectedStudent({ ...found, 포인트: String(found.포인트 || 0) });
      setStatus({ type: 'success', msg: `✅ ${found.이름} 학생이 선택되었습니다.` });
    } else {
      setSelectedStudent(null);
      setStatus({ type: 'error', msg: '❌ 등록된 학생이 없습니다.' });
    }
  }, [query, students]);

  useEffect(() => {
    const unsubscribe = subscribeNFC((scannedId) => {
      setQuery(scannedId);
      handleSearch(scannedId);
    });
    return () => unsubscribe();
  }, [handleSearch]);

  const updatePoints = async (manualAmount) => {
    const amountToUpdate = manualAmount || Number(pointAmount);
    if (!selectedStudent || !amountToUpdate) return;

    const currentPoint = Number(selectedStudent.포인트 || 0);
    const nextTotal = String(currentPoint + amountToUpdate);

    setStudents(prev => prev.map(s => 
      String(s.ID).trim() === String(selectedStudent.ID).trim() 
      ? { ...s, 포인트: nextTotal } : s
    ));
    setSelectedStudent(prev => ({ ...prev, 포인트: nextTotal }));
    setPointAmount('');
    setStatus({ type: 'success', msg: `✨ ${amountToUpdate}P 즉시 반영됨` });

    try {
      const response = await requestGAS({
        method: 'POST',
        action: 'updatePoints',
        studentId: selectedStudent.ID,
        amount: amountToUpdate
      });
      if (!response || response.status !== "success") throw new Error();
    } catch (error) {
      alert(`⚠️ [저장 실패] 서버와 연결이 원활하지 않습니다.`);
      setStatus({ type: 'error', msg: '❌ 서버 저장 실패' });
    }
  };

  return (
    <div style={containerStyle}>
      {/* 상단 헤더 - ScheduleView와 동일 */}
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>포인트 매니저</h1>
          <p style={{ color: '#888', marginTop: '5px', fontSize: '14px' }}>학생들의 활동 점수를 적립하고 차감합니다.</p>
        </div>
      </header>

      <main style={mainContentStyle}>
        {/* 검색바 섹션 */}
        <div style={searchAreaStyle}>
          <input
            style={inputStyle}
            placeholder="이름 입력 또는 카드 태그"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button style={activeTab} onClick={() => handleSearch()}>조회하기</button>
        </div>

        {status.msg && <div style={statusBanner(status.type)}>{status.msg}</div>}

        {selectedStudent ? (
          <div style={contentLayout}>
            {/* 왼쪽: 학생 프로필 카드 (DailyDashboard 스타일) */}
            <div style={profileCardStyle}>
              <div style={avatarStyle}>{selectedStudent.이름[0]}</div>
              <h2 style={nameStyle}>{selectedStudent.이름}</h2>
              <div style={idStyle}>ID: {selectedStudent.ID}</div>
              <div style={pointDisplayBox}>
                <span style={{color: '#888', fontSize: '14px'}}>현재 보유 포인트</span>
                <div style={pointValueText}>{selectedStudent.포인트} P</div>
              </div>
            </div>

            {/* 오른쪽: 포인트 조작 섹션 */}
            <div style={actionAreaStyle}>
              <section style={timeSectorStyle}>
                <div style={timeIndicatorStyle}>Quick</div>
                <div style={quickGridStyle}>
                  {quickPoints.map(pts => (
                    <button key={pts} style={quickBtnStyle} onClick={() => updatePoints(pts)}>
                      +{pts}P
                    </button>
                  ))}
                </div>
              </section>

              <section style={timeSectorStyle}>
                <div style={timeIndicatorStyle}>Input</div>
                <div style={manualInputRow}>
                  <input
                    type="number"
                    style={manualInput}
                    placeholder="직접 입력 (차감은 -)"
                    value={pointAmount}
                    onChange={(e) => setPointAmount(e.target.value)}
                  />
                  <button style={activeTab} onClick={() => updatePoints()}>적립하기</button>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div style={emptyState}>학생을 조회해주시면 포인트 관리창이 나타납니다.</div>
        )}
      </main>
    </div>
  );
}

// --- ScheduleView 기반 스타일 테마 ---
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };
const headerStyle = { padding: '30px 5% 20px 5%', backgroundColor: '#24262d', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const titleStyle = { margin: 0, fontSize: '24px', fontWeight: '700' };
const mainContentStyle = { padding: '30px 5%', boxSizing: 'border-box' };

const searchAreaStyle = { display: 'flex', gap: '15px', maxWidth: '600px', margin: '0 auto 30px auto' };
const inputStyle = { flex: 1, backgroundColor: '#24262d', border: '1px solid #333', borderRadius: '10px', padding: '12px 20px', color: '#fff', fontSize: '16px', outline: 'none' };
const activeTab = { padding: '10px 25px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', backgroundColor: '#3b82f6', color: '#fff' };

const contentLayout = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1000px', margin: '0 auto' };

// 학생 프로필 카드 스타일 (DailyDashboard 테마)
const profileCardStyle = { backgroundColor: '#24262d', borderRadius: '16px', padding: '40px 20px', border: '1px solid #333', textAlign: 'center' };
const avatarStyle = { width: '70px', height: '70px', backgroundColor: '#3b82f6', borderRadius: '20px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' };
const nameStyle = { fontSize: '24px', fontWeight: '700', margin: '10px 0' };
const idStyle = { fontSize: '14px', color: '#71717a', marginBottom: '30px' };
const pointDisplayBox = { backgroundColor: '#1a1c23', padding: '20px', borderRadius: '12px', border: '1px solid #333' };
const pointValueText = { fontSize: '32px', fontWeight: '800', color: '#3b82f6', marginTop: '10px' };

// 포인트 액션 영역 (ScheduleView의 timeSectorStyle 활용)
const actionAreaStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
const timeSectorStyle = { backgroundColor: '#24262d', borderRadius: '16px', padding: '20px', display: 'flex', gap: '20px', border: '1px solid #333' };
const timeIndicatorStyle = { minWidth: '70px', fontSize: '16px', fontWeight: '800', color: '#3b82f6', borderRight: '2px solid #333', display: 'flex', alignItems: 'center' };

const quickGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' };
const quickBtnStyle = { backgroundColor: '#2d303a', color: '#fff', border: '1px solid #3d414d', borderRadius: '10px', padding: '15px 0', fontSize: '16px', fontWeight: '700', cursor: 'pointer' };

const manualInputRow = { display: 'flex', gap: '10px', width: '100%' };
const manualInput = { ...inputStyle, backgroundColor: '#1a1c23' };

const emptyState = { textAlign: 'center', padding: '100px', color: '#555', fontSize: '18px', backgroundColor: '#24262d', borderRadius: '16px', border: '1px dashed #333' };
const statusBanner = (type) => ({ padding: '15px', borderRadius: '12px', marginBottom: '25px', textAlign: 'center', backgroundColor: type === 'success' ? '#1e293b' : '#442727', color: type === 'success' ? '#3b82f6' : '#ff4d4f', border: `1px solid ${type === 'success' ? '#3b82f6' : '#ff4d4f'}` });

export default Points;