import React, { useState, useEffect } from 'react';

function Setting({ isAttendanceMode, setIsAttendanceMode }) {
  const [gasUrl, setGasUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    const savedUrl = localStorage.getItem('gas_url');
    if (savedUrl) setGasUrl(savedUrl);
    
    return () => window.removeResizeListener?.('resize', handleResize);
  }, []);

  const handleSave = () => {
    if (!gasUrl.trim()) {
      alert("URL을 입력해주세요.");
      return;
    }
    localStorage.setItem('gas_url', gasUrl);
    setIsSaved(true);
    
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAttendanceModeToggle = (checked) => {
    setIsAttendanceMode(checked);
    localStorage.setItem('attendance_mode', checked.toString());
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle(isMobile)}>
        <div style={iconWrapper}>⚙️</div>
        <h3 style={titleStyle}>기기 환경 설정</h3>
        <p style={descStyle}>
          이 기기에서 사용할 <strong>Google Apps Script</strong> 주소를 설정합니다. 
          데이터 연결을 위해 반드시 배포된 웹 앱 URL이 필요합니다.
        </p>
        
        <div style={inputGroup}>
          <label style={labelStyle}>GAS 연동 주소 (URL)</label>
          <input 
            style={inputStyle(isSaved)} 
            placeholder="https://script.google.com/macros/s/..." 
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
          />
        </div>
        
        <button style={buttonStyle(isSaved)} onClick={handleSave}>
          {isSaved ? '✅ 설정이 저장되었습니다' : '설정 저장하기'}
        </button>

        {/* 출석모드 토글 */}
        <div style={toggleGroup}>
          <label style={toggleLabel}>
            <input
              type="checkbox"
              checked={isAttendanceMode}
              onChange={(e) => handleAttendanceModeToggle(e.target.checked)}
              style={checkboxStyle}
            />
            <span style={toggleText}>출석모드 활성화</span>
          </label>
          <p style={toggleDesc}>
            출석모드를 켜면 메뉴가 숨겨지고 출석 화면으로 바로 진입합니다.
          </p>
        </div>

        <div style={infoBox}>
          <p style={infoText}>• 브라우저 쿠키를 삭제하면 설정이 초기화될 수 있습니다.</p>
          <p style={infoText}>• 현재 기기에만 적용되는 개별 설정입니다.</p>
        </div>
      </div>
    </div>
  );
}

// --- 🎨 깔끔한 디자인 시스템 ---

const containerStyle = { 
  display: 'flex', justifyContent: 'center', alignItems: 'center', 
  minHeight: '80vh', padding: '20px' 
};

const cardStyle = (isMobile) => ({
  backgroundColor: '#24262d',
  borderRadius: '24px',
  padding: isMobile ? '30px 20px' : '40px',
  width: '100%',
  maxWidth: '500px',
  textAlign: 'center',
  border: '1px solid #333',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
});

const iconWrapper = {
  fontSize: '40px',
  marginBottom: '15px'
};

const titleStyle = { 
  fontSize: '22px', fontWeight: '800', color: '#fff', margin: '0 0 10px 0' 
};

const descStyle = { 
  color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '30px' 
};

const inputGroup = { textAlign: 'left', marginBottom: '25px' };

const labelStyle = { 
  display: 'block', fontSize: '13px', color: '#3b82f6', 
  fontWeight: 'bold', marginBottom: '8px', marginLeft: '5px' 
};

const inputStyle = (isSaved) => ({
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#1a1c23',
  border: `2px solid ${isSaved ? '#10b981' : '#333'}`,
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s ease'
});

const buttonStyle = (isSaved) => ({
  width: '100%',
  padding: '16px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: isSaved ? '#10b981' : '#3b82f6',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: isSaved ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
});

const infoBox = {
  marginTop: '30px',
  padding: '15px',
  backgroundColor: '#1a1c23',
  borderRadius: '12px',
  textAlign: 'left'
};

const infoText = {
  margin: '5px 0',
  fontSize: '12px',
  color: '#555',
  lineHeight: '1.4'
};

const toggleGroup = {
  marginTop: '30px',
  padding: '20px',
  backgroundColor: '#1a1c23',
  borderRadius: '12px',
  textAlign: 'left'
};

const toggleLabel = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600',
  color: '#fff'
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  marginRight: '12px',
  accentColor: '#3b82f6',
  cursor: 'pointer'
};

const toggleText = {
  flex: 1
};

const toggleDesc = {
  margin: '8px 0 0 0',
  fontSize: '12px',
  color: '#888',
  lineHeight: '1.4'
};

export default Setting;