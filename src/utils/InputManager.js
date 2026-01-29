// src/utils/InputManager.js

/**
 * 1. NFC 스캔 이벤트 리스너 등록/해제 유틸리티
 */
export const subscribeNFC = (callback) => {
  const handleScan = (e) => {
    if (e.detail?.id) {
      console.log("🎴 NFC 카드 감지:", e.detail.id);
      callback(e.detail.id);
    }
  };

  window.addEventListener('nfc-scan', handleScan);
  // 나중에 리스너를 지울 수 있도록 함수를 반환합니다.
  return () => window.removeEventListener('nfc-scan', handleScan);
};

/**
 * 2. 테스트용 단축키(F1) 리스너
 */
export const subscribeTestKey = () => {
  const handleKeyDown = (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      const testId = "0015434370";
      console.log(`[Test Mode] 가짜 카드 태그: ${testId}`);
      window.dispatchEvent(new CustomEvent('nfc-scan', { detail: { id: testId } }));
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
};