import React, { useState, useEffect, useRef } from 'react';

function Report({ students, headers }) {
  const [bgImage, setBgImage] = useState(null);
  const [elements, setElements] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef(null);

  // 설정 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('report_config');
    if (saved) setElements(JSON.parse(saved));
  }, []);

  const saveConfig = () => {
    localStorage.setItem('report_config', JSON.stringify(elements));
    alert("💾 배치 설정이 브라우저에 저장되었습니다!");
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

  const onMouseDown = (e, id, type) => {
    e.stopPropagation();
    e.preventDefault();
    setTargetId(id);
    if (type === 'resize') setIsResizing(true);
    else setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!containerRef.current || (!isDragging && !isResizing)) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    // 💡 마우스 위치에서 컨테이너의 시작점을 빼서 내부 좌표 계산
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setElements(prev => prev.map(el => {
      if (el.id !== targetId) return el;
      if (isDragging) return { ...el, x, y };
      if (isResizing) {
        // 핸들을 잡고 늘릴 때 x좌표 차이만큼 폰트 크기 변경
        const newSize = Math.max(10, x - el.x); 
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

  const downloadReport = (student) => {
    console.group(`📄 [성적표 출력] : ${student.이름}`);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = bgImage;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 💡 화면상 미리보기 너비와 실제 이미지 너비의 비율
      const ratio = img.width / containerRef.current.offsetWidth;
      
      ctx.drawImage(img, 0, 0);

      elements.forEach(el => {
        const studentValue = student[el.key] || student[el.text] || "";
        console.log(`매핑: ${el.text} -> 값: ${studentValue} (좌표: ${Math.round(el.x * ratio)}, ${Math.round(el.y * ratio)})`);

        ctx.font = `bold ${el.fontSize * ratio}px Arial`;
        ctx.fillStyle = el.color;
        ctx.textAlign = "left";
        ctx.textBaseline = "top"; // 미리보기 div와 기준점 일치

        ctx.fillText(studentValue, el.x * ratio, el.y * ratio);
      });

      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      console.groupEnd();
    };
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6'}}>성적표 에디터</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 업로드</label>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 설정 저장</button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => addElement(h)} style={tagBtn}>{h} +</button>
            ))}
          </div>
          
          <h4 style={{...panelTitle, marginTop: '30px'}}>출력 리스트</h4>
          <div style={studentList}>
            {students.map(s => (
              <div key={s.ID} style={studentItem}>
                <span>{s.이름}</span>
                <button onClick={() => downloadReport(s)} style={printBtn}>JPG 출력</button>
              </div>
            ))}
          </div>
        </div>

        <div style={previewArea}>
          {bgImage ? (
            <div 
              ref={containerRef}
              style={{
                ...canvasWrapper, 
                backgroundImage: `url(${bgImage})`,
                width: '100%',
                // 💡 이미지 비율에 따라 높이를 자동으로 계산해서 찌그러짐 방지
                aspectRatio: `${imgSize.w} / ${imgSize.h}`, 
                maxWidth: imgSize.w > imgSize.h ? '1000px' : '600px', // 가로/세로형에 따른 최대폭 조절
              }}
            >
              {elements.map(el => (
                <div
                  key={el.id}
                  onMouseDown={(e) => onMouseDown(e, el.id, 'drag')}
                  style={{
                    position: 'absolute', left: el.x, top: el.y,
                    fontSize: el.fontSize, color: el.color, fontWeight: 'bold',
                    cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
                    lineHeight: '1', padding: '0', border: '1px dashed #3b82f6',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'flex-start'
                  }}
                >
                  {el.text}
                  <div 
                    style={resizeHandle}
                    onMouseDown={(e) => onMouseDown(e, el.id, 'resize')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyPreview}>성적표 배경 이미지를 업로드해주세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const containerStyle = { padding: '20px', color: '#fff', height: '100vh', overflow: 'hidden' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const topBtn = { padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 100px)' };
const sidePanel = { width: '280px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px', overflowY: 'auto' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '10px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagBtn = { padding: '4px 8px', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', fontSize: '11px', cursor: 'pointer' };
const studentList = { marginTop: '10px' };
const studentItem = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #333' };
const printBtn = { padding: '4px 10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', padding: '40px', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const canvasWrapper = { position: 'relative', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', boxShadow: '0 0 30px rgba(0,0,0,0.5)' };
const emptyPreview = { color: '#444', marginTop: '100px' };
const resizeHandle = { width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%', cursor: 'nwse-resize', marginLeft: '5px', alignSelf: 'flex-end' };

export default Report;