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
  const [dragMode, setDragMode] = useState(null);
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
        if (e.target.tagName !== 'INPUT') {
          setElements(prev => prev.filter(el => el.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  const addElement = (header) => {
    const exists = elements.some(el => el.text === header);
    if (exists) {
      alert(`'${header}' 항목은 이미 추가되어 있습니다.`);
      return;
    }
    const newEl = {
      id: Date.now(),
      text: header,
      x: 100,
      y: 100,
      fontSize: 40,
      color: '#000000',
      fontWeight: 'bold'
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const removeElement = (e, id) => {
    e.stopPropagation();
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const getSVGPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = imgSize.w / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale
    };
  };

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
    alert("💾 에디터 설정이 저장되었습니다!");
  };

  // ✅ 선택 영역 해제 로직이 추가된 다운로드 함수
  const handleZipDownload = async () => {
    if (!bgImage) return alert("배경 이미지를 먼저 업로드해주세요.");
    if (elements.length === 0) return alert("추가된 항목이 없습니다.");

    // 1. 현재 선택된 것 해제 (이미지 출력물에 파란 테두리 방지)
    const backupId = selectedId;
    setSelectedId(null);
    
    // UI 업데이트 대기
    await new Promise(r => setTimeout(r, 50));

    try {
      const res = await requestGAS({ action: 'getStudents' });
      const students = (res.data || res).filter(s => s.상태 === "재원");
      
      if (students.length === 0) {
        alert("다운로드할 학생 데이터가 없습니다.");
        setSelectedId(backupId);
        return;
      }

      setProgress({ current: 0, total: students.length, status: 'processing' });
      const zip = new JSZip();

      for (let i = 0; i < students.length; i++) {
        const blob = await svgToBlob(students[i]);
        zip.file(`${students[i].이름}_성적표.jpg`, blob);
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `성적표_패키지_${new Date().toLocaleDateString()}.zip`);
    } finally {
      // 2. 작업 완료 후 다시 선택 상태 복구
      setSelectedId(backupId);
      setProgress({ current: 0, total: 0, status: 'idle' });
    }
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
        const val = String(student[el.text] || "-");
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
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={() => {setIsDragging(false); setSnapGuide({x:null, y:null});}}>
      <div style={headerSection}>
        <div>
          <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 Pro 💎</h2>
          {progress.status === 'processing' && (
            <span style={{fontSize:'12px', color:'#f59e0b'}}>생성 중... ({progress.current}/{progress.total})</span>
          )}
        </div>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 설정</label>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 세팅 저장</button>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle'} style={{...topBtn, backgroundColor: '#f59e0b'}}>
             {progress.status === 'processing' ? '압축 중...' : '📦 전체 다운로드 (ZIP)'}
           </button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가 (클릭)</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => addElement(h)} style={tagBtn}>{h} +</button>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '30px'}}>배치된 요소</h4>
          <div style={elementContainer}>
            {elements.map(el => (
              <div key={el.id} onClick={() => setSelectedId(el.id)} style={{...elementCard, border: selectedId === el.id ? '1px solid #3b82f6' : '1px solid #333'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                  <span style={{fontSize:'12px', fontWeight:'bold', color: selectedId === el.id ? '#3b82f6' : '#fff'}}>{el.text}</span>
                  <button onClick={(e) => removeElement(e, el.id)} style={delBtn}>✕</button>
                </div>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <input type="color" value={el.color} onChange={(e) => updateElement(el.id, 'color', e.target.value)} style={colorInp} />
                  <input type="number" value={Math.round(el.fontSize)} onChange={(e) => updateElement(el.id, 'fontSize', parseInt(e.target.value))} style={numInp} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={previewArea} onClick={() => setSelectedId(null)}>
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems:'center', overflow: 'auto' }}>
            <svg ref={svgRef} viewBox={`0 0 ${imgSize.w} ${imgSize.h}`} style={{ width: 'auto', height: 'auto', maxHeight: '90%', backgroundColor: '#fff', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
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
                      // ✅ selectedId가 있을 때만 테두리 표시
                      stroke: selectedId === el.id ? '#3b82f6' : 'none', strokeWidth: 2
                    }}
                    dominantBaseline="middle"
                  >{el.text}</text>
                  
                  {selectedId === el.id && (
                    <rect
                      x={el.x + (el.text.length * el.fontSize * 0.5)} 
                      y={el.y + (el.fontSize * 0.2)}
                      width={20}
                      height={20}
                      fill="#3b82f6"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => onMouseDown(e, el, 'resize')}
                    />
                  )}
                </g>
              ))}
            </svg>
            <div style={tipBox}>항목을 드래그하여 배치하고, 파란 사각형으로 크기를 조절하세요. (Del키로 삭제)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 스타일 상수는 이전과 동일하므로 생략 가능 (코드 유지)
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden', fontFamily:'sans-serif' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems:'center' };
const topBtn = { padding: '10px 18px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'13px', backgroundColor:'#3b82f6' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 80px)' };
const sidePanel = { width: '280px', backgroundColor: '#24262d', padding: '20px', borderRadius: '15px', display:'flex', flexDirection:'column', border:'1px solid #333' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '12px', fontWeight:'bold' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagBtn = { padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #444', color: '#ccc', backgroundColor: '#333', cursor: 'pointer', transition:'0.2s' };
const elementContainer = { flex:1, overflowY:'auto', marginTop:'10px', paddingRight:'5px' };
const elementCard = { backgroundColor:'#1e2028', padding:'12px', borderRadius:'10px', marginBottom:'10px', cursor:'pointer' };
const delBtn = { background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'16px', padding:'0 5px' };
const colorInp = { width:'40px', height:'24px', border:'none', backgroundColor:'transparent', cursor:'pointer' };
const numInp = { width:'60px', backgroundColor:'#2d303a', color:'#fff', border:'1px solid #444', borderRadius:'4px', fontSize:'12px', padding:'3px 5px' };
const previewArea = { flex: 1, backgroundColor: '#0f1014', borderRadius: '15px', position:'relative', border:'1px solid #333' };
const tipBox = { position:'absolute', bottom:'20px', left:'50%', transform:'translateX(-50%)', color:'#888', fontSize:'12px', backgroundColor:'rgba(0,0,0,0.7)', padding:'8px 15px', borderRadius:'20px' };

export default Report;