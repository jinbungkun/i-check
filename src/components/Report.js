import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers = [] }) {
  // --- 템플릿 관리 상태 ---
  const [templates, setTemplates] = useState([]); 
  const [currentTplId, setCurrentTplId] = useState(null);

  // --- 현재 편집 중인 데이터 ---
  const [bgImage, setBgImage] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
  const [elements, setElements] = useState([]);
  
  // --- UI 및 드래그 상태 ---
  const [selectedId, setSelectedId] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const svgRef = useRef(null);
  const textRefs = useRef({}); // 실제 텍스트 요소의 크기를 측정하기 위한 객체형 ref
  
  const [dragMode, setDragMode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapGuide, setSnapGuide] = useState({ x: null, y: null });

  // 1. 초기 로드
  useEffect(() => {
    const saved = localStorage.getItem('report_templates_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates(parsed);
        if (parsed.length > 0) loadTemplate(parsed[0]);
      } catch (e) { console.error("데이터 로드 실패:", e); }
    }
  }, []);

  // 2. 템플릿 전환
  const loadTemplate = (tpl) => {
    if (!tpl) return;
    setCurrentTplId(tpl.id);
    setBgImage(tpl.bgImage || null);
    setImgSize(tpl.imgSize || { w: 800, h: 600 });
    setElements(tpl.elements || []);
    setSelectedId(null);
  };

  // 3. 템플릿 제어 로직
  const createNewTemplate = () => {
    const name = prompt("새 성적표 종류의 이름을 입력하세요:");
    if (!name) return;
    const newTpl = {
      id: `tpl_${Date.now()}`,
      title: name,
      bgImage: null,
      imgSize: { w: 800, h: 600 },
      elements: []
    };
    const updated = [...templates, newTpl];
    setTemplates(updated);
    saveToLocal(updated);
    loadTemplate(newTpl);
  };

  const saveCurrentTemplate = () => {
    if (!currentTplId) return alert("선택된 템플릿이 없습니다.");
    const updated = templates.map(tpl => 
      tpl.id === currentTplId 
      ? { ...tpl, bgImage, imgSize, elements } 
      : tpl
    );
    setTemplates(updated);
    saveToLocal(updated);
    alert("💾 현재 템플릿 세팅이 저장되었습니다.");
  };

  const deleteTemplate = (e) => {
    e.stopPropagation();
    if (!currentTplId) return;
    if (!window.confirm("현재 템플릿을 삭제하시겠습니까?")) return;
    const updated = templates.filter(t => t.id !== currentTplId);
    setTemplates(updated);
    saveToLocal(updated);
    if (updated.length > 0) loadTemplate(updated[0]);
    else { setCurrentTplId(null); setBgImage(null); setElements([]); }
  };

  const saveToLocal = (data) => {
    localStorage.setItem('report_templates_v2', JSON.stringify(data));
  };

  // --- 편집 및 드래그 로직 ---
  useEffect(() => {
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

  const addElement = (e, header) => {
    e.stopPropagation();
    if (elements.some(el => el.text === header)) return alert(`'${header}'는 이미 있습니다.`);
    const newEl = {
      id: `id_${Date.now()}`,
      text: header,
      x: 100, y: 100,
      fontSize: 100, color: '#000000', fontWeight: 'bold'
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const updateElement = (id, field, value) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

  const getSVGPoint = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scale = imgSize.w / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
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
    if (dragMode === 'move') {
      let newX = pt.x - dragOffset.x;
      let newY = pt.y - dragOffset.y;
      let snappedX = null, snappedY = null;
      elements.forEach(other => {
        if (other.id === selectedId) return;
        if (Math.abs(newX - other.x) < 15) { newX = other.x; snappedX = newX; }
        if (Math.abs(newY - other.y) < 15) { newY = other.y; snappedY = newY; }
      });
      setSnapGuide({ x: snappedX, y: snappedY });
      updateElement(selectedId, 'x', newX);
      updateElement(selectedId, 'y', newY);
    } else if (dragMode === 'resize') {
      const diff = pt.x - dragOffset.startX;
      updateElement(selectedId, 'fontSize', Math.max(10, Math.round(dragOffset.startSize + diff * 0.8)));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const img = new Image();
      img.onload = () => { setImgSize({ w: img.width, h: img.height }); setBgImage(f.target.result); };
      img.src = f.target.result;
    };
    reader.readAsDataURL(file);
  };

  // --- 출력 로직 ---
  const handleZipDownload = async () => {
    if (!bgImage) return alert("배경 이미지를 먼저 업로드해주세요.");
    const backupId = selectedId;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 100));

    try {
      const res = await requestGAS({ action: 'getStudents' });
      const students = (res.data || res).filter(s => s.상태 === "재원");
      if (students.length === 0) return alert("데이터가 없습니다.");

      setProgress({ current: 0, total: students.length, status: 'processing' });
      const zip = new JSZip();

      for (let i = 0; i < students.length; i++) {
        const blob = await svgToBlob(students[i]);
        zip.file(`${students[i].이름}_성적표.jpg`, blob);
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `성적표_${new Date().toLocaleDateString()}.zip`);
    } catch (e) { console.error(e); }
    finally {
      setSelectedId(backupId);
      setProgress({ current: 0, total: 0, status: 'idle' });
    }
  };

  const svgToBlob = (student) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = imgSize.w; canvas.height = imgSize.h;
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
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      };
      img.src = url;
    });
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={() => {setIsDragging(false); setSnapGuide({x:null, y:null});}}>
      {/* 상단 바 */}
      <div style={templateBar}>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <h3 style={{margin:0, color:'#3b82f6', fontSize:'18px'}}>성적표 에디터 Pro</h3>
          <div style={divider} />
          <span style={{fontSize:'13px', color:'#888'}}>종류:</span>
          <select 
            value={currentTplId || ''} 
            onChange={(e) => loadTemplate(templates.find(t => t.id === e.target.value))}
            style={selectStyle}
          >
            {templates.length === 0 && <option value="">추가 필요</option>}
            {templates.map(tpl => (
              <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
            ))}
          </select>
          <button onClick={createNewTemplate} style={addTplBtn}>+ 새 종류</button>
          {currentTplId && <button onClick={deleteTemplate} style={delTplBtn}>삭제</button>}
        </div>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 변경</label>
           <button onClick={saveCurrentTemplate} style={{...topBtn, backgroundColor: '#10b981'}}>💾 세팅 저장</button>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle' || !currentTplId} style={{...topBtn, backgroundColor: '#f59e0b'}}>
             {progress.status === 'processing' ? `생성 중...(${progress.current})` : '📦 전체 다운로드'}
           </button>
        </div>
      </div>

      <div style={editorLayout}>
        {/* 왼쪽 패널 */}
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={(e) => addElement(e, h)} style={tagBtn}>{h} +</button>
            ))}
          </div>
          <h4 style={{...panelTitle, marginTop: '30px'}}>배치 리스트</h4>
          <div style={elementContainer}>
            {elements.map(el => (
              <div key={el.id} onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }} 
                   style={{...elementCard, border: selectedId === el.id ? '2px solid #3b82f6' : '1px solid #333'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                  <span style={{fontSize:'12px', fontWeight:'bold'}}>{el.text}</span>
                </div>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <input type="color" value={el.color} onClick={(e) => e.stopPropagation()} onChange={(e) => updateElement(el.id, 'color', e.target.value)} style={colorPickerStyle} />
                  <div style={numInputWrapper}>
                    <span style={{fontSize:'10px', color:'#888'}}>Size</span>
                    <input type="number" value={el.fontSize} onClick={(e) => e.stopPropagation()} onChange={(e) => updateElement(el.id, 'fontSize', parseInt(e.target.value) || 0)} style={numInp} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 프리뷰 영역 */}
        <div style={previewArea} onClick={() => setSelectedId(null)}>
          {!currentTplId ? (
            <div style={emptyState}>좌측 상단의 [+ 새 종류]를 눌러주세요.</div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems:'center', overflow: 'auto' }}>
              <svg ref={svgRef} viewBox={`0 0 ${imgSize.w} ${imgSize.h}`} style={{ width: 'auto', height: 'auto', maxHeight: '95%', backgroundColor: '#fff', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
                {bgImage && <image href={bgImage} width={imgSize.w} height={imgSize.h} />}
                {snapGuide.x && <line x1={snapGuide.x} y1="0" x2={snapGuide.x} y2={imgSize.h} stroke="#00ff00" strokeWidth="2" strokeDasharray="10,10" />}
                {snapGuide.y && <line x1="0" y1={snapGuide.y} x2={imgSize.w} y2={snapGuide.y} stroke="#00ff00" strokeWidth="2" strokeDasharray="10,10" />}
                
                {elements.map(el => {
                  const isSelected = selectedId === el.id;
                  
                  // --- 핵심: 실제 텍스트 요소로부터 크기 정보 가져오기 ---
                  const textNode = textRefs.current[el.id];
                  // getBBox는 DOM에 마운트된 후 유효합니다.
                  const bbox = textNode ? textNode.getBBox() : { x: el.x, y: el.y, width: 0, height: 0 };

                  return (
                    <g key={el.id} onClick={(e) => e.stopPropagation()}>
                      {/* 선택 박스: 실제 텍스트 크기(bbox)에 맞춤 */}
                      {isSelected && (
                        <rect 
                          x={bbox.x - 10} 
                          y={bbox.y - 10} 
                          width={bbox.width + 20} 
                          height={bbox.height + 20} 
                          fill="rgba(59, 130, 246, 0.05)" 
                          stroke="#3b82f6" 
                          strokeWidth="2" 
                          strokeDasharray="5,5" 
                          pointerEvents="none" 
                        />
                      )}
                      {/* 텍스트 요소 */}
                      <text 
                        ref={node => textRefs.current[el.id] = node} // Ref 연결
                        x={el.x} 
                        y={el.y} 
                        onMouseDown={(e) => onMouseDown(e, el, 'move')} 
                        style={{ 
                          fontSize: `${el.fontSize}px`, 
                          fill: el.color, 
                          fontWeight: 'bold', 
                          cursor: 'move', 
                          userSelect: 'none', 
                          dominantBaseline: "middle", 
                          textAnchor: "start" 
                        }}
                      >
                        {el.text}
                      </text>
                      {/* 리사이즈 핸들: 텍스트 실제 너비(bbox.width) 끝에 배치 */}
                      {isSelected && (
                        <circle 
                          cx={bbox.x + bbox.width + 5} 
                          cy={bbox.y + bbox.height + 5} 
                          r="12" 
                          fill="#3b82f6" 
                          style={{ cursor: 'nwse-resize' }} 
                          onMouseDown={(e) => onMouseDown(e, el, 'resize')} 
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- CSS 스타일 (이전과 동일) ---
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden', fontFamily:'sans-serif' };
const templateBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: '#24262d', borderRadius: '15px', marginBottom: '15px', border: '1px solid #333' };
const divider = { width: '1px', height: '20px', backgroundColor: '#444' };
const selectStyle = { backgroundColor: '#1a1c23', color: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #444', outline: 'none', minWidth:'150px' };
const addTplBtn = { padding: '8px 15px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' };
const delTplBtn = { padding: '8px 15px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' };
const topBtn = { padding: '10px 18px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'13px', backgroundColor:'#3b82f6' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 110px)' };
const sidePanel = { width: '280px', backgroundColor: '#24262d', padding: '20px', borderRadius: '15px', display:'flex', flexDirection:'column', border:'1px solid #333' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '12px', fontWeight:'bold' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagBtn = { padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #444', color: '#ccc', backgroundColor: '#333', cursor: 'pointer' };
const elementContainer = { flex:1, overflowY:'auto', marginTop:'10px' };
const elementCard = { backgroundColor:'#1e2028', padding:'12px', borderRadius:'10px', marginBottom:'10px', cursor:'pointer' };
const colorPickerStyle = { width: '30px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' };
const numInputWrapper = { display:'flex', alignItems:'center', background:'#2d303a', padding:'2px 8px', borderRadius:'4px', gap:'5px' };
const numInp = { width:'50px', backgroundColor:'transparent', color:'#fff', border:'none', outline:'none', fontSize:'13px', fontWeight:'bold' };
const previewArea = { flex: 1, backgroundColor: '#0f1014', borderRadius: '15px', position:'relative', border:'1px solid #333', display:'flex', justifyContent:'center', alignItems:'center' };
const emptyState = { color: '#555', fontSize: '18px', fontWeight: 'bold' };

export default Report;