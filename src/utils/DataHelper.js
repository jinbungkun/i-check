// src/utils/DataHelper.js

const REQUIRED_COLUMNS = ["ID", "이름", "생년월일", "학부모전화번호", "본인전화번호", "수업스케줄", "포인트", "상태", "마지막출석일"];

const forceExtractDate = (val) => {
  if (!val) return "";
  const str = String(val);
  const numbers = str.match(/\d+/g);
  if (!numbers || numbers.length < 3) return str;
  const y = numbers[0];
  const m = numbers[1].padStart(2, '0');
  const d = numbers[2].padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const filterEssentialData = (rawData) => {
  if (!rawData || !Array.isArray(rawData)) return [];
  
  return rawData.map((student) => {
    let filtered = {};
    REQUIRED_COLUMNS.forEach((col) => {
      // 💡 시트의 헤더(key)에서 공백을 제거한 것이 필터의 이름(col)과 같으면 매칭!
      const actualKey = Object.keys(student).find(key => key.replace(/\s+/g, '') === col);
      let value = (actualKey && student[actualKey] !== undefined) ? student[actualKey] : "";
      
      if (col === "마지막출석일" && value) {
        value = forceExtractDate(value);
      }
      
      // 이제 filtered["학부모전화번호"] 처럼 공백 없는 키에 값이 저장됩니다.
      filtered[col] = String(value);
    });
    return filtered;
  });
};

export const getStudent = (students, searchKey) => {
  if (!searchKey) return null;
  const key = String(searchKey).trim();
  return students.find(s => String(s.ID).trim() === key || String(s.이름).trim() === key) || null;
};

export const updateStudent = (students, updatedStudent) => {
  if (!updatedStudent || !updatedStudent.ID) return students;
  return students.map(s => String(s.ID) === String(updatedStudent.ID) ? { ...s, ...updatedStudent } : s);
};