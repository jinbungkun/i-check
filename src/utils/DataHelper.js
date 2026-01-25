// src/utils/DataHelper.js

// 1. 내가 추출하고 싶은 컬럼명 지정 (구글 시트의 헤더 이름과 일치해야 함)
const REQUIRED_COLUMNS = ["ID", "이름", "전화번호", "포인트", "상태"];

/**
 * 전체 데이터에서 필요한 카테고리만 추출하는 함수
 */
export const filterEssentialData = (rawData) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map((student) => {
    let filtered = {};
    REQUIRED_COLUMNS.forEach((col) => {
      // 해당 컬럼이 있으면 가져오고, 없으면 빈 값 처리
      filtered[col] = student[col] || "";
    });
    return filtered;
  });
};

/**
 * 로컬스토리지 관련 처리 객체
 */
export const StorageManager = {
  // 로컬스토리지에 저장
  saveStudents: (data) => {
    const essentialData = filterEssentialData(data);
    localStorage.setItem('student_master_data', JSON.stringify(essentialData));
    localStorage.setItem('last_sync_time', new Date().getTime()); // 저장 시점 기록
  },

  // 로컬스토리지에서 불러오기
  getStudents: () => {
    const saved = localStorage.getItem('student_master_data');
    return saved ? JSON.parse(saved) : null;
  },

  // 마지막 업데이트 시간 확인
  getLastSync: () => {
    return localStorage.getItem('last_sync_time');
  }
};