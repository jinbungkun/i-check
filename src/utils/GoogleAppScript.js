// src/utils/GoogleAppScript.js

export const requestGAS = async (params = {}) => {
  const baseUrl = localStorage.getItem('gas_url');
  if (!baseUrl) return { status: 'error', message: 'URL 없음' };

  // 💡 params에서 method를 추출하고, 나머지는 data로 분리합니다.
  const { method = 'GET', ...data } = params;

  try {
    let response;

    if (method.toUpperCase() === 'POST') {
      // --- [POST 방식] 출석체크 등 데이터를 저장할 때 ---
      response = await fetch(baseUrl, {
        method: 'POST',
        // GAS 보안 정책상 redirect는 반드시 follow여야 합니다.
        redirect: 'follow', 
        // 데이터를 본문(Body)에 실어서 보냅니다.
        body: JSON.stringify(data) 
      });
    } else {
      // --- [GET 방식] 학생 명단 등 데이터를 가져올 때 ---
      const queryString = Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');

      const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      response = await fetch(finalUrl, {
        method: 'GET',
        redirect: 'follow'
      });
    }

    const textData = await response.text();
    
    // JSON 응답이 아닐 경우(구글 에러 페이지 등)를 대비한 방어 코드
    if (!textData.trim().startsWith('{') && !textData.trim().startsWith('[')) {
       throw new Error("서버에서 올바른 JSON 응답이 오지 않았습니다.");
    }

    const jsonData = JSON.parse(textData); 
    console.log(`✅ [${data.action || 'Default'}] 요청 성공:`, jsonData);
    
    return { 
      status: 'success', 
      data: jsonData 
    };

  } catch (error) {
    console.error("❌ GAS 요청 실패:", error);
    return { status: 'error', message: error.message };
  }
};