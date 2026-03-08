import React, { useState, useRef } from 'react';

function Report({ students, headers }) {
  const [bgImage, setBgImage] = useState(null); // 원본 이미지
  const [elements, setElements] = useState([]); // 추가된 카테고리(텍스트)들
  const [selectedId, setSelectedId] = useState(null);
  const canvasRef = useRef(null);

  // 1. 이미지 업로드 처리
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => setBgImage(f.target.result);
      reader.readAsDataURL(file);
    }
  };

  // 2. 카테고리(항목) 추가
  const addElement = (headerName) => {
    const newElement = {
      id: Date.now(),
      text: headerName, // 항목명 (예: 이름, 포인트)
      key: headerName.replace(/\s+/g, ""), // 데이터 매칭용 키
      x: 50,
      y: 50,
      fontSize: 20
    };
    setElements([...elements, newElement]);
  };

  // 3. 위치 조정 (간이 드래그 대신 입력형으로 구현, 추후 드래그 확장 가능)
  const updatePos = (id, field, value) => {
    setElements(elements.map(el => el.id === id ? { ...el, [field]: parseInt(value) } : el));
  };

  // 4. 최종 JPG 출력 함수
  const downloadReport = (student) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = bgImage;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      elements.forEach(el => {
        ctx.font = `bold ${el.fontSize}px Arial`;
        ctx.fillStyle = "black";
        // 실제 학생 데이터에서 값 추출 (데이터가 없으면 항목명 출력)
        const val = student[el.key] || student[el.text] || "";
        ctx.fillText(val, el.x, el.y);
      });

      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    };
  };

  return (
    <div style={containerStyle}>
      <h2 style={{color: '#3b82f6', marginBottom: '20px'}}>성적표 에디터</h2>

      {/* 단계 1: 이미지 업로드 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>1. 원본 양식 등록</label>
        <input type="file" onChange={handleImageUpload} accept="image/*" style={inputStyle} />
      </div>

      {bgImage && (
        <div style={{display: 'flex', gap: '20px', flexDirection: window.innerWidth < 768 ? 'column' : 'row'}}>
          {/* 단계 2 & 3: 항목 추가 및 설정 */}
          <div style={{flex: 1}}>
            <label style={labelStyle}>2. 항목 추가 (엑셀 헤더)</label>
            <div style={tagContainer}>
              {headers.map(h => (
                <button key={h} onClick={() => addElement(h)} style={tagBtn}>{h} +</button>
              ))}
            </div>

            <div style={{marginTop: '20px'}}>
              <label style={labelStyle}>3. 위치 및 크기 조정</label>
              {elements.map(el => (
                <div key={el.id} style={controlRow}>
                  <span style={{width: '60px', fontSize: '12px'}}>{el.text}</span>
                  X: <input type="number" value={el.x} onChange={(e) => updatePos(el.id, 'x', e.target.value)} style={numInput} />
                  Y: <input type="number" value={el.y} onChange={(e) => updatePos(el.id, 'y', e.target.value)} style={numInput} />
                  Size: <input type="number" value={el.fontSize} onChange={(e) => updatePos(el.id, 'fontSize', e.target.value)} style={numInput} />
                  <button onClick={() => setElements(elements.filter(e => e.id !== el.id))} style={delBtn}>x</button>
                </div>
              ))}
            </div>
          </div>

          {/* 단계 4: 미리보기 및 출력 */}
          <div style={{flex: 1.5}}>
            <label style={labelStyle}>4. 학생별 출력 (JPG)</label>
            <div style={studentListScroll}>
              {students.map(s => (
                <div key={s.ID} style={studentItem}>
                  <span>{s.이름}</span>
                  <button onClick={() => downloadReport(s)} style={printBtn}>출력</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎨 스타일링
const containerStyle = { padding: '20px', color: '#fff' };
const sectionStyle = { marginBottom: '20px', padding: '15px', backgroundColor: '#24262d', borderRadius: '10px' };
const labelStyle = { display: 'block', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' };
const inputStyle = { color: '#ccc', fontSize: '13px' };
const tagContainer = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
const tagBtn = { padding: '6px 12px', borderRadius: '20px', border: '1px solid #3b82f6', backgroundColor: 'transparent', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' };
const controlRow = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', backgroundColor: '#1a1c23', padding: '8px', borderRadius: '5px' };
const numInput = { width: '50px', backgroundColor: '#333', border: 'none', color: '#fff', padding: '4px', borderRadius: '4px', fontSize: '12px' };
const delBtn = { backgroundColor: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' };
const studentListScroll = { maxHeight: '400px', overflowY: 'auto', backgroundColor: '#24262d', borderRadius: '10px', padding: '10px' };
const studentItem = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #333' };
const printBtn = { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontWeight: 'bold' };

export default Report;