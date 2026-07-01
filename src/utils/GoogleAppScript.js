// src/utils/GoogleAppScript.js

export const createGASResponse = ({ ok = true, data = null, message = '', meta = {}, action = 'default' }) => ({
  ok,
  status: ok ? 'success' : 'error',
  action,
  data,
  message,
  meta
});

const normalizeGASResponse = (payload, action) => {
  if (!payload || typeof payload !== 'object') {
    return createGASResponse({ ok: true, data: payload, action });
  }

  if (payload.status === 'error' || payload.ok === false) {
    return createGASResponse({
      ok: false,
      message: payload.message || 'GAS 요청이 실패했습니다.',
      action,
      meta: payload.meta || {}
    });
  }

  if (payload.status === 'success' || payload.ok === true) {
    return createGASResponse({
      ok: true,
      data: payload.data ?? payload.result ?? payload.records ?? payload.items ?? payload,
      message: payload.message || '',
      meta: payload.meta || {},
      action
    });
  }

  if (payload.data !== undefined) {
    return createGASResponse({
      ok: true,
      data: payload.data,
      message: payload.message || '',
      meta: payload.meta || {},
      action
    });
  }

  return createGASResponse({ ok: true, data: payload, action });
};

export const requestGAS = async (params = {}) => {
  const baseUrl = localStorage.getItem('gas_url');
  if (!baseUrl) return createGASResponse({ ok: false, message: 'URL 없음', action: params.action || 'default' });

  const { method = 'GET', ...data } = params;
  const actionName = data.action || 'default';

  try {
    let response;

    if (method.toUpperCase() === 'POST') {
      response = await fetch(baseUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      const queryString = Object.keys(data)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');

      const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      response = await fetch(finalUrl, {
        method: 'GET',
        redirect: 'follow'
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const textData = await response.text();

    if (!textData.trim()) {
      throw new Error('빈 응답이 왔습니다.');
    }

    if (!textData.trim().startsWith('{') && !textData.trim().startsWith('[')) {
      throw new Error('서버에서 올바른 JSON 응답이 오지 않았습니다.');
    }

    const jsonData = JSON.parse(textData);
    console.log(`✅ [${actionName}] 요청 성공:`, jsonData);

    return normalizeGASResponse(jsonData, actionName);
  } catch (error) {
    console.error('❌ GAS 요청 실패:', error);
    return createGASResponse({ ok: false, message: error.message, action: actionName });
  }
};