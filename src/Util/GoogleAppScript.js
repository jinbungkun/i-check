// src/api.js
const getGasUrl = () => localStorage.getItem('i_check_gas_url');

/**
 * 학생 목록 전체 가져오기 (GET)
 */
export const getStudents = async () => {
  const url = getGasUrl();
  if (!url) return { error: "URL_MISSING" };

  try {
    const response = await fetch(url);
    const result = await response.json();
    return result.data; // GAS에서 보낸 data 배열 반환
  } catch (error) {
    console.error("데이터 로드 실패:", error);
    return { error: "FETCH_FAILED" };
  }
};

/**
 * 신규 학생 등록하기 (POST)
 */
export const registerStudent = async (studentData) => {
  const url = getGasUrl();
  if (!url) return { error: "URL_MISSING" };

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
    return await response.json();
  } catch (error) {
    console.error("등록 실패:", error);
    return { error: "POST_FAILED" };
  }
};