import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]);
  const [bgImage, setBgImage] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
  const [elements, setElements] = useState([]); // {id, text, x, y, fontSize, color}
  const [selectedId, setSelectedId] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 1. 설정 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('svg_report_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setElements(parsed.elements || []);
      setBgImage(parsed.bgImage || null);
      setImgSize(parsed.imgSize || { w: 800, h: 600 });
    }

    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  // 2. 배경 설정 및 저장
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
  };

  const saveConfig = () => {
    const data = { elements, bgImage, imgSize };
    localStorage.setItem('svg_report_config', JSON.stringify(data));
    alert("💾 레이아웃이 저장되었습니다.");
  };

  // 3. 드래그 로직 (SVG 좌표 기준)
  const onMouseDown = (e, el) => {
    setSelectedId(el.id);
    setIsDragging(true);
    const rect = svgRef.current.getBoundingClientRect();
    const scale = imgSize.w / rect.width;
    setDragOffset({
      x: (e.clientX - rect.left) * scale - el.x,
      y: (e.clientY - rect.top) * scale - el.y
    });
  };

  const onMouseMove = (e) => {
    if (!isDragging || !selectedId) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = imgSize.w / rect.width;
    const newX = (e.clientX - rect.left) * scale - dragOffset.x;
    const newY = (e.clientY - rect.top) * scale - dragOffset.y;

    setElements(prev => prev.map(el => 
      el.id === selectedId ? { ...el, x: newX, y: newY } : el
    ));
  };

  // 4. 고화질 이미지 변환 및 압축
  const handleZipDownload = async () => {
    if (!bgImage) return alert("배경을 설정해주세요.");
    const res = await requestGAS({ action: 'getStudents' });
    const students = (res.data || res).filter(s => s.상태 === "재원");
    
    setProgress({ current: 0, total: students.length, status: 'processing' });
    const zip = new JSZip();

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const blob = await svgToBlob(student);
      zip.file(`${student.이름}_성적표.jpg`, blob);
      setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `성적표_패키지.zip`);
    setProgress({ current: 0, total: 0, status: 'idle' });
  };

  const svgToBlob = (student) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = imgSize.w;
      canvas.height = imgSize.h;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // SVG를 이미지화하여 캔버스에 그리기
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      // 텍스트 치환 (실제 데이터로)
      let studentSvg = svgData;
      elements.forEach(el => {
        const val = String(student[el.text] || el.text);
        studentSvg = studentSvg.replace(`>${el.text}</text>`, `>${val}</text>`);
      });

      const svgBlob = new Blob([studentSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      };
      img.src = url;
    });
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={() => setIsDragging(false)}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 SVG Pro 💎</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 설정</label>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 세팅 저장</button>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle'} style={{...topBtn, backgroundColor: '#f59e0b'}}>
             📦 전체 압축다운
           </button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => setElements([...elements, {id: Date.now(), text: h, x: 50, y: 50, fontSize: 40, color: '#000'}])} style={tagBtn}>{h} +</button>
            ))}
          </div>
          {selectedId && (
            <div style={{marginTop:'20px'}}>
              <h4 style={panelTitle}>선택 항목 설정</h4>
              <input type="color" value={elements.find(e=>e.id===selectedId)?.color} onChange={(e)=>setElements(prev=>prev.map(el=>el.id===selectedId?{...el, color:e.target.value}:el))} />
              <input type="number" value={elements.find(e=>e.id===selectedId)?.fontSize} onChange={(e)=>setElements(prev=>prev.map(el=>el.id===selectedId?{...el, fontSize:parseInt(e.target.value)}:el))} style={{width:'60px', marginLeft:'10px'}} />
              <button onClick={() => setElements(prev=>prev.filter(el=>el.id!==selectedId))} style={deleteBtn}>삭제</button>
            </div>
          )}
        </div>

        <div style={previewArea}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
            style={{ width: '100%', height: 'auto', maxHeight: '100%', backgroundColor: '#fff', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
          >
            {bgImage && <image href={bgImage} width={imgSize.w} height={imgSize.h} />}
            {elements.map(el => (
              <text
                key={el.id}
                x={el.x}
                y={el.y}
                onMouseDown={(e) => onMouseDown(e, el)}
                style={{
                  fontSize: `${el.fontSize}px`,
                  fill: el.color,
                  fontWeight: 'bold',
                  cursor: 'move',
                  userSelect: 'none',
                  paintOrder: 'stroke',
                  stroke: selectedId === el.id ? '#3b82f6' : 'none',
                  strokeWidth: 2
                }}
                // SVG 특성상 텍스트는 y좌표가 바닥 기준이므로 정렬 보정
                dominantBaseline="middle"
              >
                {el.text}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

// 스타일 정의 (이전과 유사)
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const topBtn = { padding: '8px 15px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'12px', backgroundColor:'#3b82f6' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 80px)' };
const sidePanel = { width: '250px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '15px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
const tagBtn = { padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', cursor: 'pointer' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow:'hidden' };
const deleteBtn = { display:'block', marginTop:'10px', width:'100%', padding:'5px', backgroundColor:'#ef4444', color:'#fff', border:'none', borderRadius:'4px' };

export default Report;