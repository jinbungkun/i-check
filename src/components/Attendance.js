import React, { useState, useEffect } from 'react';
import { StorageManager } from '../utils/DataHelper'; // 저장소 매니저 불러오기
import { theme } from '../theme'; // 기존에 만든 테마

function Attendance() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    // 1. 앱이 켜질 때 로컬스토리지에서 가공된 데이터를 가져옵니다.
    const data = StorageManager.getStudents();
    if (data) {
      setStudents(data);
    }
  }, []);

  const styles = {
    container: { width: '100%', padding: '10px' },
    header: { color: theme.colors.point, marginBottom: '20px', borderBottom: `1px solid ${theme.colors.point}`, paddingBottom: '10px' },
    count: { fontSize: '14px', color: '#888', marginBottom: '10px' },
    list: { display: 'flex', flexDirection: 'column', gap: '10px' },
    item: { 
      backgroundColor: '#222', 
      padding: '15px', 
      borderRadius: '12px', 
      border: '1px solid #333',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    name: { fontSize: '18px', fontWeight: 'bold' },
    info: { fontSize: '13px', color: '#aaa' },
    pointBadge: { backgroundColor: theme.colors.point, color: '#000', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>👥 학생 명단 테스트</h2>
      <div style={styles.count}>총 {students.length}명의 데이터가 로컬에 저장됨</div>
      
      <div style={styles.list}>
        {students.length > 0 ? (
          students.map((student, index) => (
            <div key={student.ID || index} style={styles.item}>
              <div>
                <div style={styles.name}>{student.이름}</div>
                <div style={styles.info}>ID: {student.ID} | 📱 {student.전화번호}</div>
              </div>
              <div style={styles.pointBadge}>
                {student.포인트} P
              </div>
            </div>
          ))
        ) : (
          <div style={{textAlign: 'center', padding: '50px', color: '#666'}}>
            데이터가 없습니다. <br/> [설정]에서 GAS URL을 확인하거나 새로고침 해주세요.
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance;