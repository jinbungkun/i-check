// src/utils/GoogleAppScript.js

export const requestGAS = async () => {
  const url = localStorage.getItem('i_check_gas_url');
  if (!url) return { status: 'error', message: 'URL 없음' };

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });

    // 1. 일단 텍스트로 원본 데이터를 다 받습니다.
    const textData = await response.text();
    
    // 2. 받은 텍스트를 JSON 객체로 변환합니다.
    const jsonData = JSON.parse(textData); 

    // 3. 원장님 데이터는 이미 가공된 상태이므로, 리액트에서 따로 가공할 필요가 없습니다!
    console.log("✅ 데이터 로드 성공:", jsonData);
    
    return { 
      status: 'success', 
      data: jsonData  // 이미 [{이름:...}, {이름:...}] 형태이므로 그대로 보냄
    };

  } catch (error) {
    console.error("❌ 데이터 파싱 실패:", error);
    return { status: 'error', message: '데이터 형식이 올바르지 않습니다.' };
  }
};