import React, { useState, useEffect, useRef } from 'react';

function Report({ students, headers }) {
  const [bgImage, setBgImage] = useState(null);
  const [elements, setElements] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState(0);
  const [initialMouseX, setInitialMouseX] = useState(0);

  // 💡 자석 기능을 위한 가이드라인 상태
  const [guideLines, setGuideLines] = useState({ x: null, y: null });
  const SNAP_THRESHOLD = 8; // 8픽셀 근처로 가면 자석처럼 붙음

  const containerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('report_config');
    if (saved) setElements(JSON.parse(saved));
  }, []);

  const saveConfig = () => {
    localStorage.setItem('report_config', JSON.stringify(elements));
    alert("💾 자석 정렬 설정이 저장되었습니다!");
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
      x: 100, y: 100, fontSize: 30, color: '#000000'
    };
    setElements([...elements, newElement]);
  };

  const onMouseDown = (e, el, type) => {
    e.stopPropagation();
    e.preventDefault();
    setTargetId(el.id);
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (type === 'resize') {
      setIsResizing(true);
      setInitialSize(el.fontSize);
      setInitialMouseX(e.clientX);
    } else {
      setIsDragging(true);
      setOffset({ x: mouseX - el.x, y: mouseY - el.y });
    }
  };

  const onMouseMove = (e) => {
    if (!containerRef.current || (!isDragging && !isResizing)) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setElements(prev => prev.map(el => {
      if (el.id !== targetId) return el;
      
      if (isDragging) {
        let newX = mouseX - offset.x;
        let newY = mouseY - offset.y;
        let snapX = null;
        let snapY = null;

        // 💡 자석 로직: 다른 요소들과 좌표 비교
        prev.forEach(other => {
          if (other.id === targetId) return;

          // X축 스냅 (세로 정렬)
          if (Math.abs(newX - other.x) < SNAP_THRESHOLD) {
            newX = other.x;
            snapX = newX;
          }
          // Y축 스냅 (가로 정렬)
          if (Math.abs(newY - other.y) < SNAP_THRESHOLD) {
            newY = other.y;
            snapY = newY;
          }
        });

        setGuideLines({ x: snapX, y: snapY }); // 가이드라인 표시용
        return { ...el, x: newX, y: newY };
      }
      
      if (isResizing) {
        const deltaX = e.clientX - initialMouseX;
        return { ...el, fontSize: Math.max(10, initialSize + (deltaX * 0.5)) };
      }
      return el;
    }));
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setTargetId(null);
    setGuideLines({ x: null, y: null }); // 가이드라인 제거
  };

  const downloadReport = (student) => {
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
        const studentValue = student[el.key] || student[el.text] || "";
        ctx.font = `bold ${el.fontSize * ratio}px Arial`;
        ctx.fillStyle = el.color;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(studentValue, el.x * ratio, el.y * ratio);
      });
      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    };
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6'}}>성적표 디자인 에디터 🧲</h2>
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
                <button onClick={() => downloadReport(s)} style={printBtn}>출력</button>
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
                aspectRatio: `${imgSize.w} / ${imgSize.h}`, 
                maxWidth: '800px',
              }}
            >
              {/* 💡 가이드 라인 렌더링 */}
              {guideLines.x !== null && <div style={{...vGuide, left: guideLines.x}} />}
              {guideLines.y !== null && <div style={{...hGuide, top: guideLines.y}} />}

              {elements.map(el => (
                <div
                  key={el.id}
                  onMouseDown={(e) => onMouseDown(e, el, 'drag')}
                  style={{
                    position: 'absolute', left: el.x, top: el.y,
                    fontSize: el.fontSize, color: el.color, fontWeight: 'bold',
                    cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
                    lineHeight: '1', padding: '5px', 
                    border: targetId === el.id ? '2px solid #3b82f6' : '1px dashed rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    display: 'inline-flex', alignItems: 'center'
                  }}
                >
                  {el.text}
                  <div style={resizeHandle} onMouseDown={(e) => onMouseDown(e, el, 'resize')} />
                  <button onClick={(e) => { e.stopPropagation(); setElements(elements.filter(item => item.id !== el.id)); }} style={deleteBadge}>x</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyPreview}>배경 이미지를 업로드해주세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// 🎨 스타일 추가 (가이드라인)
const vGuide = { position: 'absolute', top: 0, bottom: 0, width: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents: 'none' };
const hGuide = { position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents: 'none' };

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
const canvasWrapper = { position: 'relative', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' };
const emptyPreview = { color: '#444', marginTop: '100px' };
const resizeHandle = { width: '14px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '50%', cursor: 'nwse-resize', marginLeft: '10px' };
const deleteBadge = { marginLeft: '5px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

export default Report;