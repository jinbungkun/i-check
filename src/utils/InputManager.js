// src/utils/InputManager.js

let buffer = "";
let lastKeyTime = Date.now();

/**
 * 1. NFC 키보드 시뮬레이션 리스너 (모든 화면에서 키 입력을 감시)
 */
const startGlobalKeyListener = () => {
  window.addEventListener('keydown', (e) => {
    // 만약 현재 포커스가 input이나 textarea에 있다면 
    // 일반적인 타이핑일 수 있으므로 중복 처리를 방지하기 위해 로직을 조절할 수 있습니다.
    // 하지만 NFC 전용 PC라면 아래 로직이 가장 확실합니다.

    const now = Date.now();
    
    // 리더기는 입력 속도가 매우 빠릅니다. (50ms 이하)
    // 입력 간격이 길어지면 새로운 카드로 간주하고 버퍼를 비웁니다.
    if (now - lastKeyTime > 50) {
      buffer = "";
    }
    lastKeyTime = now;

    // 엔터(Enter) 키가 들어오면 카드 번호 입력이 끝난 것으로 판단
    if (e.key === 'Enter') {
      if (buffer.length >= 4) { // 카드 번호는 보통 4자리 이상
        console.log("📡 전역 키 입력 감지 완료:", buffer);
        window.dispatchEvent(new CustomEvent('nfc-scan', { detail: { id: buffer } }));
      }
      buffer = "";
      return;
    }

    // 숫자나 영문자 등 실제 값만 버퍼에 추가 (Control, Shift 등 제외)
    if (e.key.length === 1) {
      buffer += e.key;
    }
  });
};

// 앱 시작 시 리스너 한 번 실행
if (typeof window !== "undefined") {
  startGlobalKeyListener();
}

/**
 * 2. NFC 스캔 이벤트 리스너 등록/해제 유틸리티
 */
export const subscribeNFC = (callback) => {
  const handleScan = (e) => {
    if (e.detail?.id) {
      console.log("🎴 NFC 카드 감지:", e.detail.id);
      callback(e.detail.id);
    }
  };

  window.addEventListener('nfc-scan', handleScan);
  return () => window.removeEventListener('nfc-scan', handleScan);
};

/**
 * 3. 테스트용 단축키(F1) 리스너
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