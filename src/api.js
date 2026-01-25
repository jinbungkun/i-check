// src/api.js
import { requestGAS } from './utils/GoogleAppScript';
import { StorageManager } from './utils/DataHelper';

export const initializeAppData = async () => {
  // 1. 이미 로컬에 데이터가 있는지 확인
  const localData = StorageManager.getStudents();
  
  // 2. 데이터가 있다면 일단 그거라도 반환 (빠른 화면 표시를 위해)
  // 만약 무조건 최신 데이터를 가져오고 싶다면 이 부분을 생략하거나 '새로고침' 버튼으로 빼면 됩니다.
  if (localData && localData.length > 0) {
    console.log("로컬 데이터를 로드했습니다.");
    // 백그라운드에서 조용히 최신화하고 싶다면 여기서 fetch만 한 번 더 날려주면 됩니다.
  }

  // 3. 데이터가 아예 없거나 업데이트가 필요할 때 GAS 호출
  const result = await requestGAS('GET');
  if (result.status === "success") {
    StorageManager.saveStudents(result.data);
    return StorageManager.getStudents();
  }
  
  return localData; // 실패 시 로컬 데이터라도 유지
};