import React, { useState, useEffect, useRef } from 'react';

function Report({ students, headers }) {
  const [bgImage, setBgImage] = useState(null);
  const [elements, setElements] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const containerRef = useRef(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('report_config');
    if (saved) setElements(JSON.parse(saved));
  }, []);

  const saveConfig = () => {
    localStorage.setItem('report_config', JSON.stringify(elements));
    alert("✅ 배치 설정이 저장되었습니다!");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        const img = new Image();
        img.onload = () => {
          setImgSize({ w: img.width, h: img.height });
          setBgImage(f.target.result);
        };
        img.src = f.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const addElement = (headerName) => {
    const newElement = {
      id: Date.now(),
      text: headerName,
      key: headerName.replace(/\s+/g, ""),
      x: 50, y: 50, fontSize: 30, color: '#000000'
    };
    setElements([...elements, newElement]);
  };

  // 마우스 이벤트 처리
  const onMouseDown = (e, id, type) => {
    e.stopPropagation();
    setTargetId(id);
    if (type === 'resize') setIsResizing(true);
    else setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!containerRef.current || (!isDragging && !isResizing)) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setElements(prev => prev.map(el => {
      if (el.id !== targetId) return el;
      if (isDragging) return { ...el, x, y };
      if (isResizing) {
        const newSize = Math.max(10, x - el.x); // 가로 길이에 비례해 폰트 크기 조절
        return { ...el, fontSize: newSize };
      }
      return el;
    }));
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setTargetId(null);
  };

  // 최종 출력 및 로그 확인
  const downloadReport = (student) => {
    console.group(`📄 [성적표 출력 시작] : ${student.이름}`);
    console.log("학생 원본 데이터:", student);
    console.log("현재 설정된 요소들:", elements);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = bgImage;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ratio = img.width / containerRef.current.offsetWidth;
      ctx.drawImage(img, 0, 0);

      elements.forEach(el => {
        const dataKey = el.key;
        const studentValue = student[dataKey] || student[el.text] || "N/A";
        
        console.log(`매핑 확인 -> 항목: ${el.text}, Key: ${dataKey}, 값: ${studentValue}`);

        ctx.font = `bold ${el.fontSize * ratio}px Arial`;
        ctx.fillStyle = el.color;
        ctx.fillText(studentValue, el.x * ratio, el.y * ratio);
      });

      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      console.log("✅ 이미지 생성 완료 및 다운로드 시작");
      console.groupEnd();
    };
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6'}}>성적표 에디터 Pro</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 업로드</label>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 설정 저장</button>
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
          
          <h4 style={{...panelTitle, marginTop: '30px'}}>출력 리스트 (F12 로그 확인)</h4>
          <div style={studentList}>
            {students.map(s => (
              <div key={s.ID} style={studentItem}>
                <span>{s.이름}</span>
                <button onClick={() => downloadReport(s)} style={printBtn}>JPG 출력</button>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 미리보기 공간 */}
        <div style={previewArea}>
          {bgImage ? (
            <div 
              ref={containerRef}
              style={{
                ...canvasWrapper, 
                backgroundImage: `url(${bgImage})`,
                width: '100%', 
                maxWidth: '800px', // 가로폭 고정 후 세로 자동 계산
                aspectRatio: `${imgSize.w} / ${imgSize.h}`,
                backgroundSize: '100% 100%'
              }}
            >
              {elements.map(el => (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute', left: el.x, top: el.y,
                    fontSize: el.fontSize, color: el.color, fontWeight: 'bold',
                    cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
                    padding: '2px 5px', border: '1px solid #3b82f6',
                    backgroundColor: 'rgba(255,255,255,0.4)', transform: 'translate(-5px, -50%)'
                  }}
                  onMouseDown={(e) => onMouseDown(e, el.id, 'drag')}
                >
                  {el.text} (샘플)
                  {/* 리사이즈 핸들 (우측 하단 작은 점) */}
                  <div 
                    style={resizeHandle}
                    onMouseDown={(e) => onMouseDown(e, el.id, 'resize')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyPreview}>이미지를 업로드하면 에디터가 활성화됩니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 🎨 스타일 **/
const containerStyle = { padding: '20px', color: '#fff', height: '100vh' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const topBtn = { padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 100px)' };
const sidePanel = { width: '280px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '10px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagBtn = { padding: '4px 8px', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', fontSize: '11px', cursor: 'pointer' };
const studentList = { overflowY: 'auto', maxHeight: '400px' };
const studentItem = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #333' };
const printBtn = { padding: '4px 10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', padding: '20px', overflow: 'auto', display: 'flex', justifyContent: 'center' };
const canvasWrapper = { position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.7)' };
const emptyPreview = { color: '#444', marginTop: '100px' };
const resizeHandle = { position: 'absolute', right: '-5px', bottom: '-5px', width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', cursor: 'nwse-resize' };

export default Report;