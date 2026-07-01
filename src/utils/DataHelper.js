// src/utils/DataHelper.js

const BASIC_FIELDS = {
  id: ['ID', 'id', 'Id'],
  name: ['이름', 'name', 'Name'],
  birthDate: ['생년월일', '생년 월일', 'birthDate', 'BirthDate'],
  parentPhone: ['학부모전화번호', '학부모 전화번호', 'parentPhone', 'ParentPhone'],
  phone: ['본인전화번호', '본인 전화번호', 'phone', 'Phone'],
  classSchedule: ['수업스케줄', '수업 스케줄', 'classSchedule', 'ClassSchedule'],
  points: ['포인트', 'points', 'Points'],
  status: ['상태', 'status', 'Status'],
  lastAttendanceDate: ['마지막출석일', '마지막 출석일', 'lastAttendanceDate', 'LastAttendanceDate']
};

const CORE_FIELD_NAMES = Object.keys(BASIC_FIELDS);

const normalizeKey = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();

const forceExtractDate = (val) => {
  if (!val) return '';
  const str = String(val);
  const numbers = str.match(/\d+/g);
  if (!numbers || numbers.length < 3) return str;
  const y = numbers[0];
  const m = numbers[1].padStart(2, '0');
  const d = numbers[2].padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const findMatchingKey = (rawStudent, candidates = []) => {
  if (!rawStudent || typeof rawStudent !== 'object') return null;
  const rawKeys = Object.keys(rawStudent);
  const normalizedMap = new Map(rawKeys.map((key) => [normalizeKey(key), key]));

  for (const candidate of candidates) {
    const direct = rawKeys.find((key) => key === candidate);
    if (direct) return direct;

    const normalized = normalizeKey(candidate);
    if (normalizedMap.has(normalized)) return normalizedMap.get(normalized);
  }

  return null;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const normalizeStudent = (student) => {
  if (!student || typeof student !== 'object') {
    return {
      id: '',
      name: '',
      birthDate: '',
      parentPhone: '',
      phone: '',
      classSchedule: '',
      points: '',
      status: '',
      lastAttendanceDate: '',
      extra: {}
    };
  }

  const normalized = {
    id: '',
    name: '',
    birthDate: '',
    parentPhone: '',
    phone: '',
    classSchedule: '',
    points: '',
    status: '',
    lastAttendanceDate: '',
    extra: {}
  };

  if (student.extra && typeof student.extra === 'object') {
    Object.entries(student.extra).forEach(([key, value]) => {
      normalized.extra[key] = normalizeValue(value);
      normalized[key] = normalizeValue(value);
    });
  }

  Object.entries(BASIC_FIELDS).forEach(([canonicalField, candidates]) => {
    const rawKey = findMatchingKey(student, candidates);
    let value = rawKey ? normalizeValue(student[rawKey]) : '';

    if (!value && student[canonicalField] !== undefined && student[canonicalField] !== null) {
      value = normalizeValue(student[canonicalField]);
    }

    if (canonicalField === 'lastAttendanceDate' && value) {
      value = forceExtractDate(value);
    }

    normalized[canonicalField] = value;

    const legacyKey = canonicalField === 'id' ? 'ID'
      : canonicalField === 'name' ? '이름'
      : canonicalField === 'birthDate' ? '생년월일'
      : canonicalField === 'parentPhone' ? '학부모전화번호'
      : canonicalField === 'phone' ? '본인전화번호'
      : canonicalField === 'classSchedule' ? '수업스케줄'
      : canonicalField === 'points' ? '포인트'
      : canonicalField === 'status' ? '상태'
      : '마지막출석일';

    normalized[legacyKey] = value;
  });

  Object.keys(student).forEach((key) => {
    if (CORE_FIELD_NAMES.includes(key)) return;
    if (key === 'extra') return;

    const value = normalizeValue(student[key]);
    const normalizedKey = key.replace(/\s+/g, '');

    if (value !== '') {
      normalized.extra[key] = value;
      normalized[key] = value;
      normalized[normalizedKey] = value;
    }
  });

  return normalized;
};

export const filterEssentialData = (rawData) => {
  if (!rawData || !Array.isArray(rawData)) return [];
  return rawData.map((student) => normalizeStudent(student));
};

export const getStudent = (students, searchKey) => {
  if (!searchKey) return null;
  const key = String(searchKey).trim();
  return students.find((student) => {
    const normalized = normalizeStudent(student);
    return String(normalized.id || normalized.ID || '').trim() === key || String(normalized.name || normalized.이름 || '').trim() === key;
  }) || null;
};

export const updateStudent = (students, updatedStudent) => {
  if (!updatedStudent) return students;
  const normalizedUpdated = normalizeStudent(updatedStudent);
  const targetId = String(normalizedUpdated.id || normalizedUpdated.ID || '').trim();

  if (!targetId) return students;

  return students.map((student) => {
    const normalizedCurrent = normalizeStudent(student);
    const currentId = String(normalizedCurrent.id || normalizedCurrent.ID || '').trim();
    return currentId === targetId ? { ...normalizedCurrent, ...normalizedUpdated } : student;
  });
};