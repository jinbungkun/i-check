import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]);
  const [bgImage, setBgImage] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapGuide, setSnapGuide] = useState({ x: null, y: null });

  const SNAP_THRESHOLD = 15; // 자석 강도 (픽셀 단위)

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

  // 배경 업로드
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
    alert("💾 모든 설정이 저장되었습니다.");
  };

  // 드래그 및 Snap 로직
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
    
    let newX = (e.clientX - rect.left) * scale - dragOffset.x;
    let newY = (e.clientY - rect.top) * scale - dragOffset.y;

    // 1. Snap (자석) 기능
    let snappedX = null;
    let snappedY = null;

    elements.forEach(other => {
      if (other.id === selectedId) return;
      // X축 정렬
      if (Math.abs(newX - other.x) < SNAP_THRESHOLD) {
        newX = other.x;
        snappedX = newX;
      }
      // Y축 정렬
      if (Math.abs(newY - other.y) < SNAP_THRESHOLD) {
        newY = other.y;
        snappedY = newY;
      }
    });

    setSnapGuide({ x: snappedX, y: snappedY });
    setElements(prev => prev.map(el => 
      el.id === selectedId ? { ...el, x: newX, y: newY } : el
    ));
  };

  // 3. 휠로 사이즈 조절
  const onWheel = (e, id) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 2 : -2;
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, fontSize: Math.max(10, el.fontSize + delta) } : el
    ));
  };

  // 상세 설정 업데이트 함수
  const updateElement = (id, field, value) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

  // 다운로드 로직 (이전과 동일하되 시각적 데이터 보강)
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
              <button key={h} onClick={() => setElements([...elements, {id: Date.now(), text: h, x: 100, y: 100, fontSize: 40, color: '#000000'}])} style={tagBtn}>{h} +</button>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '30px'}}>2. 요소 관리 리스트</h4>
          <div style={elementContainer}>
            {elements.length === 0 && <p style={{color:'#666', fontSize:'12px'}}>추가된 항목이 없습니다.</p>}
            {elements.map(el => (
              <div key={el.id} 
                onClick={() => setSelectedId(el.id)}
                style={{...elementCard, border: selectedId === el.id ? '1px solid #3b82f6' : '1px solid #333'}}
              >
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                  <span style={{fontWeight:'bold', fontSize:'13px'}}>{el.text}</span>
                  <button onClick={(e) => { e.stopPropagation(); setElements(elements.filter(x=>x.id!==el.id)); }} style={miniDelBtn}>✕</button>
                </div>
                <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
                  <input type="color" value={el.color} onChange={(e) => updateElement(el.id, 'color', e.target.value)} style={colorInp} />
                  <input type="number" value={el.fontSize} onChange={(e) => updateElement(el.id, 'fontSize', parseInt(e.target.value))} style={numInp} title="폰트크기" />
                  <select style={numInp} onChange={(e) => updateElement(el.id, 'fontWeight', e.target.value)}>
                    <option value="bold">굵게</option>
                    <option value="normal">보통</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={previewArea}>
          <div style={{position:'relative', display:'inline-block'}}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
              style={{ width: '100%', height: 'auto', maxHeight: '85vh', backgroundColor: '#fff', cursor: isDragging ? 'grabbing' : 'default' }}
            >
              {bgImage && <image href={bgImage} width={imgSize.w} height={imgSize.h} />}
              
              {/* Snap 가이드선 */}
              {snapGuide.x && <line x1={snapGuide.x} y1="0" x2={snapGuide.x} y2={imgSize.h} stroke="#00ff00" strokeWidth="2" strokeDasharray="5,5" />}
              {snapGuide.y && <line x1="0" y1={snapGuide.y} x2={imgSize.w} y2={snapGuide.y} stroke="#00ff00" strokeWidth="2" strokeDasharray="5,5" />}

              {elements.map(el => (
                <text
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  onMouseDown={(e) => onMouseDown(e, el)}
                  onWheel={(e) => onWheel(e, el.id)}
                  style={{
                    fontSize: `${el.fontSize}px`,
                    fill: el.color,
                    fontWeight: el.fontWeight || 'bold',
                    cursor: 'grab',
                    userSelect: 'none',
                    paintOrder: 'stroke',
                    stroke: selectedId === el.id ? '#3b82f6' : 'none',
                    strokeWidth: selectedId === el.id ? 3 : 0
                  }}
                  dominantBaseline="middle"
                  textAnchor="start"
                >
                  {el.text}
                </text>
              ))}
            </svg>
            <div style={tipBox}>💡 텍스트 위에서 마우스 휠을 돌려 사이즈를 조절하세요!</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 스타일 정의
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const topBtn = { padding: '8px 15px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'12px', backgroundColor:'#3b82f6' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 70px)' };
const sidePanel = { width: '300px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px', display:'flex', flexDirection:'column' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '10px', borderBottom:'1px solid #333', paddingBottom:'5px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '5px' };
const tagBtn = { padding: '5px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #444', color: '#ccc', backgroundColor: '#333', cursor: 'pointer' };
const elementContainer = { flex:1, overflowY:'auto', marginTop:'10px', paddingRight:'5px' };
const elementCard = { backgroundColor:'#1e2028', padding:'10px', borderRadius:'8px', marginBottom:'10px', cursor:'pointer' };
const miniDelBtn = { background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'14px' };
const colorInp = { width:'30px', height:'25px', border:'none', padding:0, cursor:'pointer', backgroundColor:'transparent' };
const numInp = { width:'60px', height:'25px', backgroundColor:'#2d303a', color:'#fff', border:'1px solid #444', borderRadius:'4px', fontSize:'11px' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow:'hidden' };
const tipBox = { position:'absolute', bottom:'-25px', left:0, color:'#888', fontSize:'11px' };

export default Report;