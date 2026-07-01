import React, { useState, useEffect, useCallback } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import { subscribeNFC } from '../utils/InputManager';
import StatusBanner from './common/StatusBanner';

function Points({ students, setStudents }) {
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointAmount, setPointAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // 📱 모바일 감지
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (isSubmitting || !selectedStudent) return;
    
    const amountToUpdate = manualAmount || Number(pointAmount);
    if (!amountToUpdate) return;

    const currentPoint = Number(selectedStudent.포인트 || 0);
    const nextTotal = String(currentPoint + amountToUpdate);

    setIsSubmitting(true);
    setStatus({ type: 'loading', msg: '포인트를 반영하는 중입니다...' });
    setStudents(prev => prev.map(s => 
      String(s.ID).trim() === String(selectedStudent.ID).trim() 
      ? { ...s, 포인트: nextTotal } : s
    ));
    setSelectedStudent(prev => ({ ...prev, 포인트: nextTotal }));
    setPointAmount('');

    // 모바일에서는 alert 대신 상태 메시지로도 충분하지만 기존 로직 유지
    alert(`✅ ${selectedStudent.이름}: ${amountToUpdate}P 반영됨!`);

    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);

    try {
      await requestGAS({
        method: 'POST',
        action: 'updatePoints',
        studentId: selectedStudent.ID,
        amount: amountToUpdate
      });
      setStatus({ type: 'success', msg: `✅ ${selectedStudent.이름} 학생 포인트가 반영되었습니다.` });
    } catch (error) {
      console.error("서버 저장 실패", error);
      setStatus({ type: 'error', msg: '❌ 서버 저장에 실패했습니다.' });
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle(isMobile)}>
        <h1 style={titleStyle(isMobile)}>포인트 매니저</h1>
        <p style={{ color: '#888', marginTop: '5px', fontSize: '12px' }}>카드 태그 시 자동 조회됩니다.</p>
      </header>

      <main style={mainContentStyle(isMobile)}>
        <div style={searchAreaStyle(isMobile)}>
          <input
            style={inputStyle}
            placeholder="이름 또는 카드 태그"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button style={activeTab} onClick={() => handleSearch()}>조회</button>
        </div>

        {status.msg && <StatusBanner type={status.type || 'info'} message={status.msg} style={{ marginBottom: '20px' }} />}

        {selectedStudent ? (
          <div style={contentLayout(isMobile)}>
            {/* 학생 프로필 카드 */}
            <div style={profileCardStyle(isMobile)}>
              <div style={avatarStyle}>{selectedStudent.이름[0]}</div>
              <h2 style={nameStyle}>{selectedStudent.이름}</h2>
              <div style={pointDisplayBox}>
                <span style={{color: '#888', fontSize: '13px'}}>현재 보유 포인트</span>
                <div style={pointValueText}>{Number(selectedStudent.포인트).toLocaleString()} P</div>
              </div>
            </div>

            {/* 적립 액션 영역 */}
            <div style={actionAreaStyle}>
              <section style={timeSectorStyle(isMobile)}>
                <div style={timeIndicatorStyle(isMobile)}>Quick</div>
                <div style={quickGridStyle}>
                  {quickPoints.map(pts => (
                    <button 
                      key={pts} 
                      style={quickBtnStyle} 
                      onClick={() => updatePoints(pts)}
                      disabled={isSubmitting}
                    >
                      +{pts}
                    </button>
                  ))}
                </div>
              </section>

              <section style={timeSectorStyle(isMobile)}>
                <div style={timeIndicatorStyle(isMobile)}>Input</div>
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
                    disabled={isSubmitting}
                  >
                    적립
                  </button>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div style={emptyState(isMobile)}>학생을 조회해주세요.</div>
        )}
      </main>
    </div>
  );
}

// --- 🎨 반응형 스타일 디자인 ---

const containerStyle = { width: '100%', minHeight: '100vh', backgroundColor: '#1a1c23', color: '#fff' };

const headerStyle = (isMobile) => ({ 
  padding: isMobile ? '20px 15px' : '30px 5%', 
  backgroundColor: '#24262d', 
  borderBottom: '1px solid #333' 
});

const titleStyle = (isMobile) => ({ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: '700' });

const mainContentStyle = (isMobile) => ({ padding: isMobile ? '20px 15px' : '30px 5%', boxSizing: 'border-box' });

const searchAreaStyle = (isMobile) => ({ 
  display: 'flex', 
  gap: '10px', 
  maxWidth: '600px', 
  margin: isMobile ? '0 0 20px 0' : '0 auto 30px auto' 
});

const inputStyle = { flex: 1, backgroundColor: '#24262d', border: '1px solid #333', borderRadius: '10px', padding: '12px 15px', color: '#fff', fontSize: '16px', outline: 'none' };

const activeTab = { padding: '10px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', backgroundColor: '#3b82f6', color: '#fff', whiteSpace: 'nowrap' };

const contentLayout = (isMobile) => ({ 
  display: 'flex', 
  flexDirection: 'column', // 모바일/PC 모두 포인트는 세로 배치가 직관적 (단일 타겟이므로)
  gap: '20px', 
  maxWidth: '600px', 
  margin: '0 auto' 
});

const profileCardStyle = (isMobile) => ({ 
  backgroundColor: '#24262d', 
  borderRadius: '16px', 
  padding: isMobile ? '25px 15px' : '40px 20px', 
  border: '1px solid #333', 
  textAlign: 'center' 
});

const avatarStyle = { width: '60px', height: '60px', backgroundColor: '#3b82f6', borderRadius: '18px', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' };

const nameStyle = { fontSize: '22px', fontWeight: '700', margin: '0 0 15px 0' };

const pointDisplayBox = { backgroundColor: '#1a1c23', padding: '15px', borderRadius: '12px', border: '1px solid #333' };

const pointValueText = { fontSize: '28px', fontWeight: '800', color: '#3b82f6', marginTop: '5px' };

const actionAreaStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };

const timeSectorStyle = (isMobile) => ({ 
  backgroundColor: '#24262d', 
  borderRadius: '16px', 
  padding: '15px', 
  display: 'flex', 
  flexDirection: isMobile ? 'column' : 'row', // 📱 모바일은 제목을 위로
  gap: isMobile ? '10px' : '20px', 
  border: '1px solid #333' 
});

const timeIndicatorStyle = (isMobile) => ({ 
  minWidth: '60px', 
  fontSize: '14px', 
  fontWeight: '800', 
  color: '#3b82f6', 
  borderRight: isMobile ? 'none' : '2px solid #333',
  borderBottom: isMobile ? '1px solid #333' : 'none',
  paddingBottom: isMobile ? '8px' : '0',
  display: 'flex', 
  alignItems: 'center' 
});

const quickGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' };

const quickBtnStyle = { backgroundColor: '#2d303a', color: '#fff', border: '1px solid #3d414d', borderRadius: '10px', padding: '12px 0', fontSize: '15px', fontWeight: '700', cursor: 'pointer' };

const manualInputRow = { display: 'flex', gap: '10px', width: '100%' };

const manualInput = { ...inputStyle, backgroundColor: '#1a1c23', padding: '10px' };

const emptyState = (isMobile) => ({ textAlign: 'center', padding: isMobile ? '60px 20px' : '100px', color: '#555', fontSize: '16px', backgroundColor: '#24262d', borderRadius: '16px', border: '1px dashed #333' });

const statusBanner = (type) => ({ padding: '12px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', fontSize: '14px', backgroundColor: type === 'success' ? '#1e293b' : '#442727', color: type === 'success' ? '#3b82f6' : '#ff4d4f', border: `1px solid ${type === 'success' ? '#3b82f6' : '#ff4d4f'}` });

export default Points;