import React, { useState, useEffect, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';

function Points({ students, setStudents }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointAmount, setPointAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 연타 방지용 상태
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
      setStatus({ type: 'success', msg: `✅ ${found.이름} 학생 선택됨` });
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
    // 0.5초 잠금 상태라면 함수 실행 안 함
    if (isSubmitting || !selectedStudent) return;
    
    const amountToUpdate = manualAmount || Number(pointAmount);
    if (!amountToUpdate) return;

    const currentPoint = Number(selectedStudent.포인트 || 0);
    const nextTotal = String(currentPoint + amountToUpdate);

    // 1️⃣ 버튼 잠금 및 낙관적 업데이트
    setIsSubmitting(true);
    setStudents(prev => prev.map(s => 
      String(s.ID).trim() === String(selectedStudent.ID).trim() 
      ? { ...s, 포인트: nextTotal } : s
    ));
    setSelectedStudent(prev => ({ ...prev, 포인트: nextTotal }));
    setPointAmount('');

    // 2️⃣ 사용자에게 알림 팝업 (확인 누르는 동안 시간 벌기)
    alert(`✅ ${selectedStudent.이름}: ${amountToUpdate}P 반영됨!`);

    // 3️⃣ 0.5초 후에 버튼 잠금 해제
    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);

    // 4️⃣ 서버 전송 (백그라운드에서 조용히 처리)
    try {
      requestGAS({
        method: 'POST',
        action: 'updatePoints',
        studentId: selectedStudent.ID,
        amount: amountToUpdate
      });
    } catch (error) {
      console.error("서버 백그라운드 저장 실패");
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>포인트 매니저</h1>
          <p style={{ color: '#888', marginTop: '5px', fontSize: '14px' }}>반영 버튼 클릭 시 연타 방지 기능이 작동합니다.</p>
        </div>
      </header>

      <main style={mainContentStyle}>
        <div style={searchAreaStyle}>
          <input
            style={inputStyle}
            placeholder="이름 입력 또는 카드 태그"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button style={activeTab} onClick={() => handleSearch()}>조회</button>
        </div>

        {status.msg && <div style={statusBanner(status.type)}>{status.msg}</div>}

        {selectedStudent ? (
          <div style={contentLayout}>
            <div style={profileCardStyle}>
              <div style={avatarStyle}>{selectedStudent.이름[0]}</div>
              <h2 style={nameStyle}>{selectedStudent.이름}</h2>
              <div style={pointDisplayBox}>
                <span style={{color: '#888', fontSize: '14px'}}>현재 보유 포인트</span>
                <div style={pointValueText}>{selectedStudent.포인트} P</div>
              </div>
            </div>

            <div style={actionAreaStyle}>
              <section style={timeSectorStyle}>
                <div style={timeIndicatorStyle}>Quick</div>
                <div style={quickGridStyle}>
                  {quickPoints.map(pts => (
                    <button 
                      key={pts} 
                      style={quickBtnStyle} 
                      onClick={() => updatePoints(pts)}
                      disabled={isSubmitting} // 0.5초간 비활성화
                    >
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
                    placeholder="직접 입력"
                    value={pointAmount}
                    onChange={(e) => setPointAmount(e.target.value)}
                  />
                  <button 
                    style={activeTab} 
                    onClick={() => updatePoints()}
                    disabled={isSubmitting} // 0.5초간 비활성화
                  >
                    적립하기
                  </button>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div style={emptyState}>학생을 조회해주세요.</div>
        )}
      </main>
    </div>
  );
}

// --- 스타일 디자인 생략 (이전과 동일) ---
const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };
const headerStyle = { padding: '30px 5% 20px 5%', backgroundColor: '#24262d', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const titleStyle = { margin: 0, fontSize: '24px', fontWeight: '700' };
const mainContentStyle = { padding: '30px 5%', boxSizing: 'border-box' };
const searchAreaStyle = { display: 'flex', gap: '15px', maxWidth: '600px', margin: '0 auto 30px auto' };
const inputStyle = { flex: 1, backgroundColor: '#24262d', border: '1px solid #333', borderRadius: '10px', padding: '12px 20px', color: '#fff', fontSize: '16px', outline: 'none' };
const activeTab = { padding: '10px 25px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', backgroundColor: '#3b82f6', color: '#fff' };
const contentLayout = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1000px', margin: '0 auto' };
const profileCardStyle = { backgroundColor: '#24262d', borderRadius: '16px', padding: '40px 20px', border: '1px solid #333', textAlign: 'center' };
const avatarStyle = { width: '70px', height: '70px', backgroundColor: '#3b82f6', borderRadius: '20px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' };
const nameStyle = { fontSize: '24px', fontWeight: '700', margin: '10px 0' };
const pointDisplayBox = { backgroundColor: '#1a1c23', padding: '20px', borderRadius: '12px', border: '1px solid #333' };
const pointValueText = { fontSize: '32px', fontWeight: '800', color: '#3b82f6', marginTop: '10px' };
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