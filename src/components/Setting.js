import React, { useState, useEffect } from 'react';
import { theme, commonStyles } from '../theme';

function Setting() {
  const [gasUrl, setGasUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // 1. 컴포넌트가 켜질 때 로컬스토리지에서 기존 주소 가져오기
  useEffect(() => {
    const savedUrl = localStorage.getItem('i_check_gas_url');
    if (savedUrl) {
      setGasUrl(savedUrl);
    }
  }, []);

  // 2. 저장 함수
  const handleSave = () => {
    if (!gasUrl.trim()) {
      alert("GAS URL을 입력해주세요.");
      return;
    }
    localStorage.setItem('i_check_gas_url', gasUrl);
    setIsSaved(true);
    alert("이 기기에 설정이 저장되었습니다! ✅");

    // 2초 후에 '저장 완료' 상태 해제 (UI 피드백용)
    setTimeout(() => setIsSaved(false), 2000);
  };

  const styles = {
    card: { ...commonStyles.card },
    title: { color: theme.colors.point, fontSize: '22px', fontWeight: '800', marginBottom: '10px' },
    desc: { color: theme.colors.subText, fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' },
    input: { 
      ...commonStyles.input,
      borderColor: isSaved ? theme.colors.success : '#444' 
    },
    button: {
      ...commonStyles.input,
      backgroundColor: isSaved ? theme.colors.success : theme.colors.point,
      color: '#000',
      fontWeight: 'bold',
      cursor: 'pointer',
      border: 'none',
      marginTop: '20px',
      transition: 'all 0.3s ease'
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>⚙️ 기기 설정</h3>
      <p style={styles.desc}>
        이 기기 전용 Google Apps Script 주소를 입력하세요.<br/>
        브라우저를 닫아도 설정은 유지됩니다.
      </p>
      
      <input 
        style={styles.input} 
        placeholder="goole AppsScript URL을 입력하세요" 
        value={gasUrl}
        onChange={(e) => setGasUrl(e.target.value)}
      />
      
      <button style={styles.button} onClick={handleSave}>
        {isSaved ? '저장 완료!' : '설정 저장하기'}
      </button>
    </div>
  );
}

export default Setting;