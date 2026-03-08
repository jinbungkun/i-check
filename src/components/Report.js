import React, { useState, useEffect, useRef } from 'react';

function Report({ students, headers }) {
  const [bgImage, setBgImage] = useState(null);
  const [elements, setElements] = useState([]); // 배치된 항목들
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const containerRef = useRef(null);

  // 1. 페이지 로드시 저장된 설정 불러오기
  useEffect(() => {
    const savedConfig = localStorage.getItem('report_config');
    if (savedConfig) {
      setElements(JSON.parse(savedConfig));
    }
  }, []);

  // 2. 설정 저장하기
  const saveConfig = () => {
    localStorage.setItem('report_config', JSON.stringify(elements));
    alert("📌 배치 설정이 저장되었습니다. 다음 접속 시에도 유지됩니다!");
  };

  // 3. 이미지 업로드
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => setBgImage(f.target.result);
      reader.readAsDataURL(file);
    }
  };

  // 4. 항목 추가 (중앙 배치 시작)
  const addElement = (headerName) => {
    const newElement = {
      id: Date.now(),
      text: headerName,
      key: headerName.replace(/\s+/g, ""),
      x: 100,
      y: 100,
      fontSize: 24,
      color: '#000000'
    };
    setElements([...elements, newElement]);
  };

  // 5. 드래그 로직 (마우스/터치 대응)
  const onMouseDown = (id) => {
    setIsDragging(true);
    setDragTarget(id);
  };

  const onMouseMove = (e) => {
    if (!isDragging || !dragTarget || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setElements(prev => prev.map(el => 
      el.id === dragTarget ? { ...el, x, y } : el
    ));
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
  };

  // 6. 텍스트 크기 조절
  const updateFontSize = (id, delta) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, fontSize: Math.max(10, el.fontSize + delta) } : el
    ));
  };

  // 7. 최종 출력 (Canvas)
  const downloadReport = (student) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = bgImage;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 실제 이미지 크기와 화면 미리보기 크기의 비율 계산 (좌표 보정)
      const ratio = img.width / containerRef.current.offsetWidth;

      ctx.drawImage(img, 0, 0);
      elements.forEach(el => {
        ctx.font = `bold ${el.fontSize * ratio}px Arial`;
        ctx.fillStyle = el.color;
        const val = student[el.key] || student[el.text] || "";
        ctx.fillText(val, el.x * ratio, el.y * ratio);
      });

      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    };
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6'}}>성적표 디자인 에디터</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 이미지 업로드</label>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 현재 배치 저장</button>
        </div>
      </div>

      <div style={editorLayout}>
        {/* 왼쪽: 설정 패널 */}
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => addElement(h)} style={tagBtn}>{h} +</button>
            ))}
          </div>
          
          <h4 style={{...panelTitle, marginTop: '20px'}}>선택된 항목 수정</h4>
          <div style={elementList}>
            {elements.map(el => (
              <div key={el.id} style={elControl}>
                <span style={{fontSize:'12px', fontWeight:'bold'}}>{el.text}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => updateFontSize(el.id, 2)} style={smallBtn}>A+</button>
                  <button onClick={() => updateFontSize(el.id, -2)} style={smallBtn}>A-</button>
                  <button onClick={() => setElements(elements.filter(e => e.id !== el.id))} style={delBtn}>🗑️</button>
                </div>
              </div>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '20px'}}>학생 데이터 출력</h4>
          <div style={studentList}>
            {students.map(s => (
              <div key={s.ID} style={studentItem}>
                <span>{s.이름}</span>
                <button onClick={() => downloadReport(s)} style={printBtn}>출력</button>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 미리보기 공간 (드래그 가능 영역) */}
        <div style={previewArea}>
          {bgImage ? (
            <div 
              ref={containerRef}
              style={{...canvasWrapper, backgroundImage: `url(${bgImage})`}}
            >
              {elements.map(el => (
                <div
                  key={el.id}
                  onMouseDown={() => onMouseDown(el.id)}
                  style={{
                    position: 'absolute',
                    left: el.x,
                    top: el.y,
                    fontSize: el.fontSize,
                    color: el.color,
                    fontWeight: 'bold',
                    cursor: 'move',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    padding: '2px 5px',
                    border: dragTarget === el.id ? '1px dashed #3b82f6' : '1px solid transparent',
                    backgroundColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  {el.text} (샘플)
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyPreview}>이미지를 업로드하면 미리보기가 활성화됩니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 🎨 스타일 **/
const containerStyle = { padding: '20px', color: '#fff', height: 'calc(100vh - 150px)', overflow: 'hidden' };
const headerSection = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const topBtn = { padding: '10px 15px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' };
const editorLayout = { display: 'flex', gap: '20px', height: '100%' };
const sidePanel = { width: '300px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px', overflowY: 'auto' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagBtn = { padding: '5px 10px', borderRadius: '15px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', fontSize: '11px', cursor: 'pointer' };
const elementList = { display: 'flex', flexDirection: 'column', gap: '8px' };
const elControl = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#1a1c23', borderRadius: '8px' };
const smallBtn = { padding: '2px 6px', fontSize: '10px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const delBtn = { ...smallBtn, backgroundColor: '#7f1d1d' };
const studentList = { display: 'flex', flexDirection: 'column', gap: '5px' };
const studentItem = { display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #333', fontSize: '13px' };
const printBtn = { padding: '3px 8px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' };
const previewArea = { flex: 1, backgroundColor: '#000', borderRadius: '15px', overflow: 'auto', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px' };
const canvasWrapper = { position: 'relative', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', boxShadow: '0 0 20px rgba(0,0,0,0.5)', width: '100%', aspectRatio: 'auto', minHeight: '600px' };
const emptyPreview = { color: '#555', marginTop: '100px' };

export default Report;