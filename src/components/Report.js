import React, { useState } from 'react';

function Report({ students }) {
  const [isProcessing, setIsProcessing] = useState(false);

  // 🎨 성적표 생성 함수
  const drawAndDownload = (student) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const backgroundImage = new Image();

    // 1. 배경 이미지 설정 (public 폴더에 있는 파일명과 일치해야 함)
    // 테스트용으로 외부 이미지를 쓰거나, 실제 원장님의 배경 파일 경로를 넣으세요.
    backgroundImage.src = process.env.PUBLIC_URL + '/report_card_bg.jpg'; 
    backgroundImage.crossOrigin = "Anonymous"; // 외부 이미지 사용 시 필요

    backgroundImage.onload = () => {
      // 2. 캔버스 크기를 이미지 원본 크기에 맞춤
      canvas.width = backgroundImage.width;
      canvas.height = backgroundImage.height;

      // 3. 배경 이미지 그리기
      ctx.drawImage(backgroundImage, 0, 0);

      // 4. 텍스트 입히기 (여기가 핵심!)
      ctx.fillStyle = "#000000"; // 글자색 (검정)
      
      // [이름 넣기]
      ctx.font = "bold 50px Arial"; // 폰트 크기와 종류
      ctx.textAlign = "center";
      ctx.fillText(student.이름, canvas.width / 2, 450); // (내용, x좌표, y좌표)

      // [ID/번호 넣기]
      ctx.font = "30px Arial";
      ctx.fillText(`학생번호: ${student.ID}`, canvas.width / 2, 520);

      // [스케줄 정보 넣기]
      ctx.font = "25px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`수업 스케줄: ${student.수업스케줄 || '정보없음'}`, 150, 700);

      // 5. 파일 다운로드 (JPG)
      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9); // 0.9는 품질(90%)
      link.click();
      
      setIsProcessing(false);
    };

    backgroundImage.onerror = () => {
      alert("배경 이미지(report_card_bg.jpg)를 불러올 수 없습니다. public 폴더를 확인해주세요!");
      setIsProcessing(false);
    };
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>📜 성적표 개별 출력</h2>
      <p style={subTitleStyle}>학생을 선택하면 미리 설정된 양식에 맞춰 JPG가 생성됩니다.</p>

      <div style={listContainer}>
        {students.map((student) => (
          <div key={student.ID} style={studentRow}>
            <div style={infoBox}>
              <span style={nameStyle}>{student.이름}</span>
              <span style={idStyle}>{student.ID}</span>
            </div>
            <button 
              onClick={() => drawAndDownload(student)}
              style={downloadBtn}
            >
              JPG 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🎨 스타일 정의
const containerStyle = { padding: '20px', color: '#fff' };
const titleStyle = { fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '10px' };
const subTitleStyle = { color: '#94a3b8', fontSize: '14px', marginBottom: '30px' };
const listContainer = { display: 'flex', flexDirection: 'column', gap: '12px' };
const studentRow = { backgroundColor: '#24262d', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' };
const infoBox = { display: 'flex', flexDirection: 'column', gap: '4px' };
const nameStyle = { fontSize: '18px', fontWeight: 'bold' };
const idStyle = { fontSize: '12px', color: '#666' };
const downloadBtn = { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

export default Report;