import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// IndexedDB 설정 (배경 이미지 영구 저장)
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
  const [isLoading, setIsLoading] = useState(false);
  
  // 💡 진행 상태 관리
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
          img.onload = () => { setImgSize({ w: img.width, h: img.height }); setBgImage(e.target.result); };
          img.src = e.target.result;
        }
      };
    };
    loadSavedImage();
  }, []);

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

  const loadData = async () => {
    if (fullStudents.length > 0) return fullStudents;
    setIsLoading(true);
    try {
      const res = await requestGAS({ action: 'getStudents' });
      if (res) {
        const activeOnly = res.filter(s => s.상태 === "재원");
        setFullStudents(activeOnly);
        return activeOnly;
      }
    } catch (e) { alert(e.message); }
    finally { setIsLoading(false); }
    return [];
  };

  const generateImageBlob = (student, bgImgObj) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = bgImgObj.width;
      canvas.height = bgImgObj.height;
      const ratio = bgImgObj.width / containerRef.current.offsetWidth;
      ctx.drawImage(bgImgObj, 0, 0);
      elements.forEach(el => {
        ctx.font = `bold ${el.fontSize * ratio}px Arial`;
        ctx.fillStyle = el.color;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(student[el.text] || "", el.x * ratio, el.y * ratio);
      });
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8); // 용량 최적화를 위해 0.8 권장
    });
  };

  // 💡 [메인 기능] 전체 압축 및 진행률 표시
  const handleZipDownload = async () => {
    if (!bgImage) return alert("배경 이미지를 업로드해주세요.");
    const studentsToPrint = await loadData();
    if (studentsToPrint.length === 0) return;

    if (!window.confirm(`${studentsToPrint.length}명의 재원생 성적표 압축을 시작합니다.`)) return;

    setProgress({ current: 0, total: studentsToPrint.length, status: 'processing' });

    const zip = new JSZip();
    const bgImgObj = new Image();
    bgImgObj.src = bgImage;

    bgImgObj.onload = async () => {
      for (let i = 0; i < studentsToPrint.length; i++) {
        const student = studentsToPrint[i];
        const blob = await generateImageBlob(student, bgImgObj);
        zip.file(`${student.이름}_성적표.jpg`, blob);
        
        // 💡 실시간 진행률 업데이트
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }

      setProgress(prev => ({ ...prev, status: 'zipping' }));
      
      const content = await zip.generateAsync({ type: "blob" });
      
      // 💡 완료 시 파일명에 날짜 포함하여 자동 다운로드
      const fileName = `성적표_전체_${new Date().toISOString().slice(0, 10)}.zip`;
      saveAs(content, fileName);
      
      setProgress({ current: 0, total: 0, status: 'idle' });
      alert("전체 다운로드가 완료되었습니다!");
    };
  };

  // 마우스 이벤트 (드래그/리사이즈)
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
        const deltaX = e.clientX - initialMouseX;
        return prev.map(el => el.id === targetId ? { ...el, fontSize: Math.max(10, initialSize + (deltaX * 0.5)) } : el);
      }
      if (isDragging) {
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
      }
      return prev;
    });
  };

  const onMouseUp = () => { setIsDragging(false); setIsResizing(false); setTargetId(null); setGuideLines({ x: null, y: null }); };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 Pro 🧲</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 변경</label>
           
           {/* 💡 버튼에 진행률 표시 */}
           <button 
             onClick={handleZipDownload} 
             disabled={progress.status !== 'idle'}
             style={{...topBtn, backgroundColor: progress.status !== 'idle' ? '#6b7280' : '#f59e0b'}}
           >
             {progress.status === 'processing' ? `⏳ 생성 중 (${progress.current}/${progress.total})` :
              progress.status === 'zipping' ? `📦 압축 파일 생성 중...` : `📦 재원생 전체 압축다운`}
           </button>

           <button onClick={() => { localStorage.setItem('report_config', JSON.stringify(elements)); alert("💾 저장완료"); }} style={{...topBtn, backgroundColor: '#10b981'}}>💾 설정 저장</button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>1. 항목 추가</h4>
          <div style={tagBox}>{headers.map(h => <button key={h} onClick={() => setElements([...elements, {id:Date.now(), text:h, x:50, y:50, fontSize:24, color:'#000'}])} style={tagBtn}>{h} +</button>)}</div>

          <h4 style={{...panelTitle, marginTop: '25px'}}>2. 항목 설정 & 삭제</h4>
          <div style={elementList}>
            {elements.map(el => (
              <div key={el.id} style={elControlCard}>
                <div style={{fontWeight:'bold', fontSize:'12px', marginBottom:'5px'}}>{el.text}</div>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <input type="color" value={el.color} onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, color:e.target.value} : item))} style={colorPicker} />
                  <input type="number" value={Math.round(el.fontSize)} onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, fontSize:parseInt(e.target.value)} : item))} style={sizeInput} />
                  <button onClick={() => setElements(elements.filter(item => item.id !== el.id))} style={delBtn}>삭제</button>
                </div>
              </div>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '25px'}}>3. 재원생 명단 ({fullStudents.length})</h4>
          <div style={studentList}>
            {isLoading ? <p>불러오는 중...</p> : fullStudents.length === 0 ? <button onClick={loadData} style={loadBtn}>명단 미리보기</button> :
             fullStudents.map(s => (
               <div key={s.ID} style={studentItem}><span>{s.이름}</span><button onClick={() => {
                 const img = new Image(); img.src = bgImage; img.onload = () => generateImageBlob(s, img).then(blob => saveAs(blob, `${s.이름}_성적표.jpg`));
               }} style={printBtn}>출력</button></div>
             ))}
          </div>
        </div>

        <div style={previewArea}>
          {bgImage ? (
            <div ref={containerRef} style={{...canvasWrapper, backgroundImage: `url(${bgImage})`, aspectRatio: `${imgSize.w} / ${imgSize.h}`, maxWidth: '850px', width: '100%'}}>
              {guideLines.x !== null && <div style={{...vGuide, left: guideLines.x}} />}
              {guideLines.y !== null && <div style={{...hGuide, top: guideLines.y}} />}
              {elements.map(el => (
                <div key={el.id} onMouseDown={(e) => onMouseDown(e, el, 'drag')}
                  style={{
                    position: 'absolute', left: el.x, top: el.y, fontSize: el.fontSize, color: el.color,
                    fontWeight: 'bold', cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
                    border: targetId === el.id ? '2px solid #3b82f6' : '1px dashed rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px'
                  }}
                >
                  {el.text}
                  <div onMouseDown={(e) => onMouseDown(e, el, 'resize')} style={resizer} />
                </div>
              ))}
            </div>
          ) : <div style={emptyPreview}>배경을 업로드하세요.</div>}
        </div>
      </div>
      
      {/* 💡 하단 진행바 (옵션) */}
      {progress.status !== 'idle' && (
        <div style={progressOverlay}>
          <div style={progressBox}>
            <p>{progress.status === 'processing' ? `학생 성적표 생성 중... (${progress.current} / ${progress.total})` : `파일 압축 중... 잠시만 기다려주세요.`}</p>
            <div style={progressBarContainer}>
              <div style={{...progressBar, width: `${(progress.current / progress.total) * 100}%`}}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 스타일 시트
const resizer = { width: '10px', height: '10px', backgroundColor: '#3b82f6', position: 'absolute', right: '-5px', bottom: '-5px', cursor: 'nwse-resize', borderRadius: '50%' };
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden', position:'relative' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const topBtn = { padding: '8px 15px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'12px', minWidth:'120px' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 100px)' };
const sidePanel = { width: '300px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px', overflowY: 'auto' };
const panelTitle = { fontSize: '13px', color: '#3b82f6', borderBottom: '1px solid #333', paddingBottom: '5px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '5px' };
const tagBtn = { padding: '3px 7px', fontSize: '11px', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', cursor: 'pointer' };
const elementList = { display: 'flex', flexDirection: 'column', gap: '8px' };
const elControlCard = { backgroundColor: '#1a1c23', padding: '10px', borderRadius: '8px' };
const colorPicker = { width: '25px', height: '25px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' };
const sizeInput = { width: '45px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '3px' };
const delBtn = { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '3px 7px', borderRadius: '4px', cursor: 'pointer' };
const studentList = { marginTop: '10px' };
const studentItem = { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #333' };
const printBtn = { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '2px 7px', borderRadius: '4px' };
const loadBtn = { width: '100%', padding: '10px', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', padding: '20px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const canvasWrapper = { position: 'relative', backgroundSize: '100% 100%' };
const vGuide = { position: 'absolute', top: 0, bottom: 0, width: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents:'none' };
const hGuide = { position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents:'none' };
const emptyPreview = { color: '#444', marginTop: '150px' };

// 진행바 스타일
const progressOverlay = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
const progressBox = { backgroundColor: '#24262d', padding: '30px', borderRadius: '15px', width: '400px', textAlign: 'center' };
const progressBarContainer = { width: '100%', height: '10px', backgroundColor: '#444', borderRadius: '5px', marginTop: '15px', overflow: 'hidden' };
const progressBar = { height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s ease' };

export default Report;