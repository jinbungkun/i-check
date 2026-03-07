// src/components/Report.js
import React from 'react';

function Report({ students, headers }) {
  return (
    <div style={{ color: '#fff', padding: '20px' }}>
      <h2>성적표 관리</h2>
      <p>등록된 학생 수: {students.length}명</p>
      {/* 여기에 아까 알려드린 성적표 생성 로직을 넣으시면 됩니다! */}
    </div>
  );
}

// 💡 이게 반드시 있어야 App.js에서 에러가 안 납니다!
export default Report;