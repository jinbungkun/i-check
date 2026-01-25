// src/utils/GoogleAppScript.js
export const requestGAS = () => {
  return new Promise((resolve, reject) => {
    const url = localStorage.getItem('i_check_gas_url');
    const callbackName = 'google_callback_' + Math.round(100000 * Math.random());
    
    // 글로벌 영역에 함수를 잠시 만듭니다.
    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
    script.onerror = () => reject(new Error('네트워크 에러'));
    document.body.appendChild(script);
  });
};