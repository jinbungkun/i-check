import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const dbName = "ReportEditorDB";
const storeName = "assets";
const initDB = () => {
  return new Promise((resolve) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
    request.onsuccess = (e) => resolve(e.target.result);
  });
};

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' }); 
  const [bgImage, setBgImage] = useState(null);
  const [elements, setElements] = useState([]);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  
  const [targetId, setTargetId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState(0);
  const [initialMouseX, setInitialMouseX] = useState(0);
  const [guideLines, setGuideLines] = useState({ x: null, y: null });

  const containerRef = useRef(null);
  const SNAP_THRESHOLD = 8;

  useEffect(() => {
    const savedConfig = localStorage.getItem('report_config');
    if (savedConfig) setElements(JSON.parse(savedConfig));
    const loadSavedImage = async () => {
      const db = await initDB();
      const transaction = db.transaction(storeName, "readonly");
      const getRequest = transaction.objectStore(storeName).get("bgImage");
      getRequest.onsuccess = (e) => {
        if (e.target.result) {
          const img = new Image();
          img.onload = () => { 
            setImgSize({ w: img.width, h: img.height }); 
            setBgImage(e.target.result); 
          };
          img.src = e.target.result;
        }
      };
    };
    loadSavedImage();
  }, []);

  const loadData = async () => {
    if (fullStudents.length > 0) return fullStudents;
    setIsLoading(true);
    try {
      const res = await requestGAS({ action: 'getStudents' });
      const rawData = res.data || res; 
      if (Array.isArray(rawData)) {
        const activeOnly = rawData.filter(student => student.상태 === "재원");
        setFullStudents(activeOnly);
        if(activeOnly.length > 0) setSelectedStudent(activeOnly[0]); 
        return activeOnly;
      }
      return [];
    } catch (e) {
      alert("데이터 로드 중 오류!"); return [];
    } finally { setIsLoading(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (f) => {
        const data = f.target.result;
        const img = new Image();
        img.onload = async () => {
          setImgSize({ w: img.width, h: img.height });
          setBgImage(data);
          const db = await initDB();
          db.transaction(storeName, "readwrite").objectStore(storeName).put(data, "bgImage");
        };
        img.src = data;
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImageBlob = (student, bgImgObj) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = bgImgObj.width;
      canvas.height = bgImgObj.height;
      
      // 화면 컨테이너 대비 실제 이미지의 배율
      const ratio = bgImgObj.width / containerRef.current.offsetWidth;
      
      ctx.drawImage(bgImgObj, 0, 0);
      
      elements.forEach(el => {
        const fontSize = el.fontSize * ratio;
        // 폰트 설정 (화면과 동일하게 bold 적용)
        ctx.font = `bold ${fontSize}px "Nanum Gothic", sans-serif`;
        ctx.fillStyle = el.color;
        
        // 💡 핵심 1: 텍스트 기준점을 화면과 동일하게 'top'으로 설정
        ctx.textBaseline = "top";
        
        const textValue = String(student[el.text] || "");
        const textWidth = ctx.measureText(textValue).width;
        
        // 💡 핵심 2: X좌표 보정 (정렬 방식에 따른 정확한 계산)
        let drawX = el.x * ratio;
        let drawY = el.y * ratio;

        if (el.align === "center") {
          drawX = drawX - (textWidth / 2);
        } else if (el.align === "right") {
          drawX = drawX - textWidth;
        }

        // 💡 핵심 3: Y좌표 미세 보정
        // 브라우저 렌더링 특성상 발생하는 상단 여백(ascent) 오차를 줄이기 위해 
        // 화면과 동일한 위치에 글자를 그립니다.
        ctx.fillText(textValue, drawX, drawY);
      });
      
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 1.0);
    });
  };

  const handleZipDownload = async () => {
    if (!bgImage) return alert("배경 이미지를 먼저 업로드해주세요.");
    const studentsToPrint = await loadData();
    if (!studentsToPrint.length) return alert("출력할 재원생이 없습니다.");

    if (!window.confirm(`${studentsToPrint.length}명의 압축파일 생성을 시작합니다.`)) return;
    setProgress({ current: 0, total: studentsToPrint.length, status: 'processing' });

    const zip = new JSZip();
    const bgImgObj = new Image();
    bgImgObj.src = bgImage;

    bgImgObj.onload = async () => {
      for (let i = 0; i < studentsToPrint.length; i++) {
        const blob = await generateImageBlob(studentsToPrint[i], bgImgObj);
        zip.file(`${studentsToPrint[i].이름}_성적표.jpg`, blob);
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }
      setProgress(prev => ({ ...prev, status: 'zipping' }));
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `성적표_패키지_${new Date().toISOString().slice(0, 10)}.zip`);
      setProgress({ current: 0, total: 0, status: 'idle' });
      alert("압축 완료!");
    };
  };

  const onMouseDown = (e, el, type) => {
    e.stopPropagation(); e.preventDefault();
    setTargetId(el.id);
    const rect = containerRef.current.getBoundingClientRect();
    if (type === 'resize') {
      setIsResizing(true); setInitialSize(el.fontSize); setInitialMouseX(e.clientX);
    } else {
      setIsDragging(true); setOffset({ x: (e.clientX - rect.left) - el.x, y: (e.clientY - rect.top) - el.y });
    }
  };

  const onMouseMove = (e) => {
    if ((!isDragging && !isResizing) || !targetId) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    setElements(prev => {
      if (isResizing) {
        return prev.map(el => el.id === targetId ? { ...el, fontSize: Math.max(10, initialSize + (e.clientX - initialMouseX) * 0.5) } : el);
      }
      
      let newX = (e.clientX - rect.left) - offset.x;
      let newY = (e.clientY - rect.top) - offset.y;
      
      let snapX = null, snapY = null;
      prev.forEach(other => {
        if (other.id === targetId) return;
        if (Math.abs(newX - other.x) < SNAP_THRESHOLD) { newX = other.x; snapX = newX; }
        if (Math.abs(newY - other.y) < SNAP_THRESHOLD) { newY = other.y; snapY = newY; }
      });
      
      setGuideLines({ x: snapX, y: snapY });
      return prev.map(el => el.id === targetId ? { ...el, x: newX, y: newY } : el);
    });
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={() => {setIsDragging(false); setIsResizing(false); setTargetId(null); setGuideLines({x:null, y:null});}}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 Pro 💎</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 설정</label>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle'} style={{...topBtn, backgroundColor: '#f59e0b'}}>
             {progress.status !== 'idle' ? '⏳ 처리중...' : '📦 전체 압축다운'}
           </button>
           <button onClick={() => { localStorage.setItem('report_config', JSON.stringify(elements)); alert("💾 저장완료"); }} style={{...topBtn, backgroundColor: '#10b981'}}>💾 레이아웃 저장</button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>1. 항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => setElements([...elements, {id:Date.now(), text:h, x:50, y:50, fontSize:24, color:'#000', align:'left'}])} style={tagBtn}>{h} +</button>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '20px'}}>2. 요소 상세 설정</h4>
          <div style={elementList}>
            {elements.map(el => (
              <div key={el.id} style={{...elControlCard, border: targetId === el.id ? '1px solid #3b82f6' : '1px solid #333'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                  <span style={{fontSize:'12px', fontWeight:'bold'}}>{el.text}</span>
                  <button onClick={() => setElements(elements.filter(item => item.id !== el.id))} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}>✕</button>
                </div>
                <div style={{display:'flex', gap:'5px'}}>
                  <input type="color" value={el.color} onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, color:e.target.value} : item))} style={colorPicker} />
                  <select value={el.align} onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, align:e.target.value} : item))} style={selectInput}>
                    <option value="left">좌</option><option value="center">중</option><option value="right">우</option>
                  </select>
                  <input type="number" value={Math.round(el.fontSize)} onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, fontSize:parseInt(e.target.value)} : item))} style={sizeInput} />
                </div>
              </div>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '20px'}}>3. 학생 선택 (미리보기)</h4>
          <div style={studentList}>
            {fullStudents.length === 0 ? <button onClick={loadData} style={loadBtn}>명단 불러오기</button> : 
              fullStudents.map(s => (
                <div key={s.ID} onClick={() => setSelectedStudent(s)} style={{...studentItem, backgroundColor: selectedStudent?.ID === s.ID ? '#3b82f644' : 'transparent'}}>
                  <span>{s.이름}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div style={previewArea}>
          {bgImage ? (
            <div 
              ref={containerRef} 
              style={{
                ...canvasWrapper, 
                backgroundImage: `url(${bgImage})`, 
                width: imgSize.w > imgSize.h ? '100%' : 'auto', // 가로형은 꽉 채우고, 세로형은 자동
                height: imgSize.h >= imgSize.w ? '100%' : 'auto', // 세로형은 높이 꽉 채우기
                aspectRatio: `${imgSize.w} / ${imgSize.h}`,
                maxHeight: '100%',
                maxWidth: '100%'
              }}>
              
              {guideLines.x !== null && <div style={{...vGuide, left: guideLines.x}} />}
              {guideLines.y !== null && <div style={{...hGuide, top: guideLines.y}} />}

              {elements.map(el => (
                <div key={el.id} onMouseDown={(e) => onMouseDown(e, el, 'drag')}
                  style={{
                    position: 'absolute', left: el.x, top: el.y, fontSize: el.fontSize, color: el.color,
                    fontWeight: 'bold', cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
                    transform: el.align === 'center' ? 'translateX(-50%)' : el.align === 'right' ? 'translateX(-100%)' : 'none',
                    border: targetId === el.id ? '2px solid #3b82f6' : '1px dashed rgba(255,255,255,0.2)',
                  }}
                >
                  {selectedStudent ? (selectedStudent[el.text] || el.text) : el.text}
                  <div onMouseDown={(e) => onMouseDown(e, el, 'resize')} style={resizer} />
                </div>
              ))}
            </div>
          ) : <div style={emptyPreview}>먼저 배경 이미지를 업로드해 주세요!</div>}
        </div>
      </div>

      {progress.status !== 'idle' && (
        <div style={progressOverlay}>
          <div style={progressBox}>
            <h3 style={{margin:0}}>{progress.status === 'processing' ? '🖼️ 이미지 생성 중...' : '📦 파일 압축 중...'}</h3>
            <p>{progress.current} / {progress.total}</p>
            <div style={progressBarContainer}><div style={{...progressBar, width: `${(progress.current/progress.total)*100}%`}} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

// 스타일 정의 (이전과 동일하지만 잘림 방지를 위해 수정)
const elementList = { display: 'flex', flexDirection: 'column', gap: '8px' };
const selectInput = { backgroundColor:'#1a1c23', color:'#fff', border:'1px solid #444', borderRadius:'4px', fontSize:'11px', padding: '2px' };
const resizer = { width: '10px', height: '10px', backgroundColor: '#3b82f6', position: 'absolute', right: '-5px', bottom: '-5px', cursor: 'nwse-resize', borderRadius: '50%' };
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden', position:'relative' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const topBtn = { padding: '8px 15px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'12px' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 80px)' };
const sidePanel = { width: '320px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px', overflowY: 'auto' };
const panelTitle = { fontSize: '13px', color: '#3b82f6', borderBottom: '1px solid #333', paddingBottom: '5px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '5px' };
const tagBtn = { padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', cursor: 'pointer' };
const elControlCard = { backgroundColor: '#1a1c23', padding: '10px', borderRadius: '8px', marginBottom: '8px' };
const colorPicker = { width: '25px', height: '25px', border: 'none', cursor: 'pointer' };
const sizeInput = { width: '45px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' };
const studentList = { marginTop: '10px', display:'flex', flexDirection:'column', gap:'5px' };
const studentItem = { padding: '8px', borderRadius: '6px', cursor: 'pointer', borderBottom: '1px solid #333', fontSize:'13px' };
const loadBtn = { width: '100%', padding: '10px', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '8px' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow:'hidden' };
const canvasWrapper = { position: 'relative', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', boxShadow: '0 0 30px rgba(0,0,0,0.5)' };
const vGuide = { position: 'absolute', top: 0, bottom: 0, width: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents:'none' };
const hGuide = { position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents:'none' };
const emptyPreview = { color: '#444', fontSize: '18px' };
const progressOverlay = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const progressBox = { backgroundColor: '#24262d', padding: '40px', borderRadius: '20px', width: '350px', textAlign: 'center' };
const progressBarContainer = { width: '100%', height: '8px', backgroundColor: '#444', borderRadius: '4px', marginTop: '20px', overflow: 'hidden' };
const progressBar = { height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s ease' };

export default Report;