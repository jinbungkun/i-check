import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers }) {
  const [bgImage, setBgImage] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  
  const svgRef = useRef(null);
  const [dragMode, setDragMode] = useState(null); // 'move' 또는 'resize'
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapGuide, setSnapGuide] = useState({ x: null, y: null });

  const SNAP_THRESHOLD = 15;

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

  // 마우스 좌표를 SVG 좌표로 변환하는 유틸리티
  const getSVGPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = imgSize.w / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale
    };
  };

  // 드래그 시작 (이동 또는 크기조절)
  const onMouseDown = (e, el, mode) => {
    e.stopPropagation();
    setSelectedId(el.id);
    setDragMode(mode);
    setIsDragging(true);
    const pt = getSVGPoint(e);
    setDragOffset({ x: pt.x - el.x, y: pt.y - el.y, startSize: el.fontSize, startX: pt.x });
  };

  const onMouseMove = (e) => {
    if (!isDragging || !selectedId) return;
    const pt = getSVGPoint(e);
    const target = elements.find(el => el.id === selectedId);
    if (!target) return;

    if (dragMode === 'move') {
      let newX = pt.x - dragOffset.x;
      let newY = pt.y - dragOffset.y;
      let snappedX = null, snappedY = null;

      elements.forEach(other => {
        if (other.id === selectedId) return;
        if (Math.abs(newX - other.x) < SNAP_THRESHOLD) { newX = other.x; snappedX = newX; }
        if (Math.abs(newY - other.y) < SNAP_THRESHOLD) { newY = other.y; snappedY = newY; }
      });

      setSnapGuide({ x: snappedX, y: snappedY });
      updateElement(selectedId, 'x', newX);
      updateElement(selectedId, 'y', newY);
    } 
    else if (dragMode === 'resize') {
      // 드래그한 거리만큼 폰트 사이즈 조절
      const diff = pt.x - dragOffset.startX;
      const newSize = Math.max(10, dragOffset.startSize + diff * 0.5);
      updateElement(selectedId, 'fontSize', newSize);
    }
  };

  const updateElement = (id, field, value) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

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
    localStorage.setItem('svg_report_config', JSON.stringify({ elements, bgImage, imgSize }));
    alert("💾 저장 완료!");
  };

  // ZIP 다운로드 로직 (기존과 동일하므로 생략 가능하나 구조 유지)
  const handleZipDownload = async () => {
    if (!bgImage) return alert("배경을 설정해주세요.");
    const res = await requestGAS({ action: 'getStudents' });
    const students = (res.data || res).filter(s => s.상태 === "재원");
    setProgress({ current: 0, total: students.length, status: 'processing' });
    const zip = new JSZip();
    for (let i = 0; i < students.length; i++) {
      const blob = await svgToBlob(students[i]);
      zip.file(`${students[i].이름}_성적표.jpg`, blob);
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
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
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
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      };
      img.src = url;
    });
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={() => {setIsDragging(false); setSnapGuide({x:null, y:null});}}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 SVG Pro 💎</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 설정</label>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 세팅 저장</button>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle'} style={{...topBtn, backgroundColor: '#f59e0b'}}>📦 전체 다운로드</button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => setElements([...elements, {id: Date.now(), text: h, x: 100, y: 100, fontSize: 40, color: '#000000', fontWeight: 'bold'}])} style={tagBtn}>{h} +</button>
            ))}
          </div>
          <h4 style={{...panelTitle, marginTop: '30px'}}>요소 리스트</h4>
          <div style={elementContainer}>
            {elements.map(el => (
              <div key={el.id} onClick={() => setSelectedId(el.id)} style={{...elementCard, border: selectedId === el.id ? '1px solid #3b82f6' : '1px solid #333'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                  <span style={{fontSize:'12px'}}>{el.text}</span>
                  <button onClick={() => setElements(elements.filter(x=>x.id!==el.id))} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}>✕</button>
                </div>
                <div style={{display:'flex', gap:'5px'}}>
                  <input type="color" value={el.color} onChange={(e) => updateElement(el.id, 'color', e.target.value)} style={{width:'30px', height:'20px', border:'none'}} />
                  <input type="number" value={Math.round(el.fontSize)} onChange={(e) => updateElement(el.id, 'fontSize', parseInt(e.target.value))} style={numInp} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={previewArea}>
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <svg ref={svgRef} viewBox={`0 0 ${imgSize.w} ${imgSize.h}`} style={{ width: 'auto', height: 'auto', minWidth: '800px', backgroundColor: '#fff', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
              {bgImage && <image href={bgImage} width={imgSize.w} height={imgSize.h} />}
              
              {snapGuide.x && <line x1={snapGuide.x} y1="0" x2={snapGuide.x} y2={imgSize.h} stroke="#00ff00" strokeWidth="2" strokeDasharray="10,10" />}
              {snapGuide.y && <line x1="0" y1={snapGuide.y} x2={imgSize.w} y2={snapGuide.y} stroke="#00ff00" strokeWidth="2" strokeDasharray="10,10" />}

              {elements.map(el => (
                <g key={el.id}>
                  <text
                    x={el.x}
                    y={el.y}
                    onMouseDown={(e) => onMouseDown(e, el, 'move')}
                    style={{
                      fontSize: `${el.fontSize}px`, fill: el.color, fontWeight: el.fontWeight || 'bold',
                      cursor: 'move', userSelect: 'none', paintOrder: 'stroke',
                      stroke: selectedId === el.id ? '#3b82f6' : 'none', strokeWidth: el.fontSize * 0.05
                    }}
                    dominantBaseline="middle"
                  >{el.text}</text>
                  
                  {/* 조절 핸들: 선택되었을 때만 텍스트 오른쪽 하단에 표시 */}
                  {selectedId === el.id && (
                    <rect
                      x={el.x + (el.text.length * el.fontSize * 0.6)} // 대략적인 텍스트 끝 위치
                      y={el.y + (el.fontSize * 0.3)}
                      width={el.fontSize * 0.4}
                      height={el.fontSize * 0.4}
                      fill="#3b82f6"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => onMouseDown(e, el, 'resize')}
                    />
                  )}
                </g>
              ))}
            </svg>
            <div style={tipBox}>💡 텍스트 클릭 후 파란 사각형을 당겨서 크기를 조절하세요!</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 스타일 정의 (이전과 동일)
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const topBtn = { padding: '8px 15px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'12px', backgroundColor:'#3b82f6' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 70px)' };
const sidePanel = { width: '250px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px', display:'flex', flexDirection:'column' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '10px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '5px' };
const tagBtn = { padding: '5px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #444', color: '#ccc', backgroundColor: '#333', cursor: 'pointer' };
const elementContainer = { flex:1, overflowY:'auto', marginTop:'10px' };
const elementCard = { backgroundColor:'#1e2028', padding:'10px', borderRadius:'8px', marginBottom:'8px' };
const numInp = { width:'50px', backgroundColor:'#2d303a', color:'#fff', border:'1px solid #444', borderRadius:'4px', fontSize:'11px' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow:'hidden' };
const tipBox = { position:'absolute', bottom:'10px', right:'20px', color:'#888', fontSize:'11px', backgroundColor:'rgba(0,0,0,0.5)', padding:'5px 10px', borderRadius:'20px' };

export default Report;