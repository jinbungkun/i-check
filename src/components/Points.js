import React, { useState, useEffect, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';

function Points({ students, setStudents }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointAmount, setPointAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 🚀 중복 클릭 방지 상태
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
    // 1️⃣ 중복 요청 방지: 이미 처리 중이면 함수 종료
    if (isSubmitting || !selectedStudent) return;
    
    const amountToUpdate = manualAmount || Number(pointAmount);
    if (!amountToUpdate) return;

    const currentPoint = Number(selectedStudent.포인트 || 0);
    const nextTotal = String(currentPoint + amountToUpdate);

    // 처리 시작 (버튼 비활성화 효과)
    setIsSubmitting(true);

    // 2️⃣ [낙관적 업데이트] 화면 즉시 반영
    setStudents(prev => prev.map(s => 
      String(s.ID).trim() === String(selectedStudent.ID).trim() 
      ? { ...s, 포인트: nextTotal } : s
    ));
    setSelectedStudent(prev => ({ ...prev, 포인트: nextTotal }));
    setPointAmount('');

    try {
      // 3️⃣ 서버 통신
      const response = await requestGAS({
        method: 'POST',
        action: 'updatePoints',
        studentId: selectedStudent.ID,
        amount: amountToUpdate
      });

      if (response && response.status === "success") {
        // 4️⃣ ✅ 반영 성공 알림 팝업 (원장님이 확인을 눌러야 다음 진행 가능)
        alert(`✨ 포인트 반영 완료!\n\n학생: ${selectedStudent.이름}\n변동: ${amountToUpdate > 0 ? '+' : ''}${amountToUpdate}P\n최종: ${nextTotal}P`);
        setStatus({ type: 'success', msg: `✅ ${amountToUpdate}P 반영 성공` });
      } else {
        throw new Error("서버 응답 이상");
      }
    } catch (error) {
      alert(`❌ 서버 저장 실패!\n화면에는 반영되었으나 시트에는 기록되지 않았을 수 있습니다.\n인터넷 연결을 확인하고 다시 시도해 주세요.`);
      setStatus({ type: 'error', msg: '❌ 서버 저장 실패' });
    } finally {
      // 5️⃣ 처리 완료 후 잠금 해제
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>포인트 매니저</h1>
          <p style={{ color: '#888', marginTop: '5px', fontSize: '14px' }}>반영 성공 시 알림 팝업이 표시됩니다.</p>
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
            disabled={isSubmitting} // 처리 중엔 입력 방지
          />
          <button style={activeTab} onClick={() => handleSearch()} disabled={isSubmitting}>조회</button>
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
              <section style={{...timeSectorStyle, opacity: isSubmitting ? 0.5 : 1}}>
                <div style={timeIndicatorStyle}>Quick</div>
                <div style={quickGridStyle}>
                  {quickPoints.map(pts => (
                    <button 
                      key={pts} 
                      style={quickBtnStyle} 
                      onClick={() => updatePoints(pts)}
                      disabled={isSubmitting} // 🚀 서버 응답 전까지 중복 클릭 차단
                    >
                      +{pts}P
                    </button>
                  ))}
                </div>
              </section>

              <section style={{...timeSectorStyle, opacity: isSubmitting ? 0.5 : 1}}>
                <div style={timeIndicatorStyle}>Input</div>
                <div style={manualInputRow}>
                  <input
                    type="number"
                    style={manualInput}
                    placeholder="직접 입력"
                    value={pointAmount}
                    onChange={(e) => setPointAmount(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button 
                    style={activeTab} 
                    onClick={() => updatePoints()}
                    disabled={isSubmitting} // 🚀 서버 응답 전까지 중복 클릭 차단
                  >
                    적립하기
                  </button>
                </div>
              </section>
              {isSubmitting && <p style={{textAlign: 'center', color: '#3b82f6'}}>⏳ 서버에 기록 중입니다...</p>}
            </div>
          </div>
        ) : (
          <div style={emptyState}>학생을 조회하면 포인트 관리창이 나타납니다.</div>
        )}
      </main>
    </div>
  );
}

// --- 스타일 디자인 (ScheduleView 테마 유지) ---
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
const timeSectorStyle = { backgroundColor: '#24262d', borderRadius: '16px', padding: '20px', display: 'flex', gap: '20px', border: '1px solid #333', transition: 'opacity 0.2s' };
const timeIndicatorStyle = { minWidth: '70px', fontSize: '16px', fontWeight: '800', color: '#3b82f6', borderRight: '2px solid #333', display: 'flex', alignItems: 'center' };
const quickGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' };
const quickBtnStyle = { backgroundColor: '#2d303a', color: '#fff', border: '1px solid #3d414d', borderRadius: '10px', padding: '15px 0', fontSize: '16px', fontWeight: '700', cursor: 'pointer' };
const manualInputRow = { display: 'flex', gap: '10px', width: '100%' };
const manualInput = { ...inputStyle, backgroundColor: '#1a1c23' };
const emptyState = { textAlign: 'center', padding: '100px', color: '#555', fontSize: '18px', backgroundColor: '#24262d', borderRadius: '16px', border: '1px dashed #333' };
const statusBanner = (type) => ({ padding: '15px', borderRadius: '12px', marginBottom: '25px', textAlign: 'center', backgroundColor: type === 'success' ? '#1e293b' : '#442727', color: type === 'success' ? '#3b82f6' : '#ff4d4f', border: `1px solid ${type === 'success' ? '#3b82f6' : '#ff4d4f'}` });

export default Points;