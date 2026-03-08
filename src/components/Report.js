import React, { useState, useEffect, useRef } from 'react';
import { requestGAS } from '../utils/GoogleAppScript';

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [bgImage, setBgImage] = useState(null);
  const [elements, setElements] = useState([]);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  
  // 드래그 및 정렬 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [targetId, setTargetId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [guideLines, setGuideLines] = useState({ x: null, y: null });
  
  const containerRef = useRef(null);
  const SNAP_THRESHOLD = 8; // 자석 강도 (8px)

  // 1. 초기 설정 로드 (배치 정보)
  useEffect(() => {
    const saved = localStorage.getItem('report_config');
    if (saved) setElements(JSON.parse(saved));
    
    // 컴포넌트 종료 시 메모리 해제
    return () => setFullStudents([]);
  }, []);

  // 2. 데이터 요청 확인 및 로드 함수
  const loadDataWithConfirm = async () => {
    if (fullStudents.length > 0) return true;

    const proceed = window.confirm("성적표 출력을 위해 엑셀의 전체 학생 데이터를 불러오시겠습니까?");
    if (!proceed) return false;

    setIsLoading(true);
    try {
      const res = await requestGAS({ action: 'getStudents' });
      if (res && Array.isArray(res)) {
        setFullStudents(res);
        return true;
      }
    } catch (e) {
      alert("데이터를 가져오는데 실패했습니다: " + e.message);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  // 3. 이미지 업로드 처리
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

  // 4. 항목 조작 함수들
  const addElement = (headerName) => {
    const newElement = {
      id: Date.now(),
      text: headerName,
      x: 50, y: 50, fontSize: 24, color: '#000000'
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id, key, value) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, [key]: value } : el));
  };

  const removeElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  const saveConfig = () => {
    localStorage.setItem('report_config', JSON.stringify(elements));
    alert("💾 배치 및 스타일 설정이 브라우저에 저장되었습니다.");
  };

  // 5. 드래그 및 자석 정렬 로직
  const onMouseDown = (e, el) => {
    e.stopPropagation();
    e.preventDefault();
    setTargetId(el.id);
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setOffset({ x: (e.clientX - rect.left) - el.x, y: (e.clientY - rect.top) - el.y });
  };

  const onMouseMove = (e) => {
    if (!isDragging || !targetId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setElements(prev => {
      let newX = mouseX - offset.x;
      let newY = mouseY - offset.y;
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

  const onMouseUp = () => {
    setIsDragging(false);
    setTargetId(null);
    setGuideLines({ x: null, y: null });
  };

  // 6. 출력(다운로드) 로직
  const downloadReport = (student) => {
    if (!bgImage) return alert("배경 이미지를 먼저 업로드해주세요.");
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = bgImage;
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      const ratio = img.width / containerRef.current.offsetWidth;
      ctx.drawImage(img, 0, 0);
      elements.forEach(el => {
        ctx.font = `bold ${el.fontSize * ratio}px Arial`;
        ctx.fillStyle = el.color;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(student[el.text] || "", el.x * ratio, el.y * ratio);
      });
      const link = document.createElement('a');
      link.download = `${student.이름}_성적표.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    };
  };

  const handleAllPrint = async () => {
    const loaded = await loadDataWithConfirm();
    if (loaded) {
      if (window.confirm(`${fullStudents.length}명 전체 성적표 다운로드를 시작할까요?`)) {
        fullStudents.forEach((s, i) => setTimeout(() => downloadReport(s), i * 600));
      }
    }
  };

  return (
    <div style={containerStyle} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {/* 상단바 */}
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 Pro</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 업로드</label>
           <button onClick={handleAllPrint} style={{...topBtn, backgroundColor: '#f59e0b'}}>🖨️ 전체 출력</button>
           <button onClick={saveConfig} style={{...topBtn, backgroundColor: '#10b981'}}>💾 설정 저장</button>
        </div>
      </div>

      <div style={editorLayout}>
        {/* 왼쪽 사이드바 */}
        <div style={sidePanel}>
          <h4 style={panelTitle}>1. 항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => addElement(h)} style={tagBtn}>{h} +</button>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '25px'}}>2. 항목 설정 & 삭제</h4>
          <div style={elementList}>
            {elements.map(el => (
              <div key={el.id} style={elControlCard}>
                <div style={{fontWeight:'bold', marginBottom:'8px', fontSize:'12px'}}>{el.text}</div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <input type="color" value={el.color} onChange={(e) => updateElement(el.id, 'color', e.target.value)} style={colorPicker} title="색상 변경" />
                  <input type="number" value={el.fontSize} onChange={(e) => updateElement(el.id, 'fontSize', parseInt(e.target.value))} style={sizeInput} title="크기 조절" />
                  <button onClick={() => removeElement(el.id)} style={delBtn}>삭제</button>
                </div>
              </div>
            ))}
          </div>

          <h4 style={{...panelTitle, marginTop: '25px'}}>3. 학생 명단 {fullStudents.length > 0 ? `(${fullStudents.length}명)` : ""}</h4>
          <div style={studentList}>
            {isLoading ? <p style={{fontSize:'12px', color:'#3b82f6'}}>데이터 로딩 중...</p> : 
             fullStudents.length === 0 ? <button onClick={loadDataWithConfirm} style={loadBtn}>명단 불러오기</button> :
             fullStudents.map(s => (
               <div key={s.ID} style={studentItem}>
                 <span>{s.이름}</span>
                 <button onClick={() => downloadReport(s)} style={printBtn}>출력</button>
               </div>
             ))}
          </div>
        </div>

        {/* 메인 미리보기 영역 */}
        <div style={previewArea}>
          {bgImage ? (
            <div ref={containerRef} style={{...canvasWrapper, backgroundImage: `url(${bgImage})`, aspectRatio: `${imgSize.w} / ${imgSize.h}`, maxWidth: '850px', width: '100%'}}>
              {guideLines.x !== null && <div style={{...vGuide, left: guideLines.x}} />}
              {guideLines.y !== null && <div style={{...hGuide, top: guideLines.y}} />}
              {elements.map(el => (
                <div key={el.id} onMouseDown={(e) => onMouseDown(e, el)}
                  style={{
                    position: 'absolute', left: el.x, top: el.y, fontSize: el.fontSize, color: el.color,
                    fontWeight: 'bold', cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
                    lineHeight: '1', padding: '4px', border: targetId === el.id ? '2px solid #3b82f6' : '1px dashed rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  }}
                >
                  {el.text}
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyPreview}>배경 이미지를 업로드하면 에디터가 활성화됩니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 🎨 스타일 시트 **/
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', overflow: 'hidden', backgroundColor:'#1a1c23' };
const headerSection = { display: 'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '20px' };
const topBtn = { padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', border:'none', fontSize:'13px' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 100px)' };
const sidePanel = { width: '320px', backgroundColor: '#24262d', padding: '20px', borderRadius: '15px', overflowY: 'auto' };
const panelTitle = { fontSize: '13px', color: '#3b82f6', marginBottom: '12px', borderBottom:'1px solid #333', paddingBottom:'5px', fontWeight:'bold' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const tagBtn = { padding: '4px 8px', borderRadius: '5px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', fontSize: '11px', cursor: 'pointer' };
const elementList = { display: 'flex', flexDirection: 'column', gap: '10px' };
const elControlCard = { backgroundColor: '#1a1c23', padding: '10px', borderRadius: '8px', border: '1px solid #333' };
const colorPicker = { width: '24px', height: '24px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' };
const sizeInput = { width: '45px', padding: '3px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#fff', fontSize:'12px' };
const delBtn = { marginLeft:'auto', padding: '3px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' };
const studentList = { marginTop: '10px' };
const studentItem = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #333', fontSize: '13px' };
const printBtn = { padding: '2px 8px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' };
const loadBtn = { width:'100%', padding:'10px', backgroundColor:'#4b5563', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'bold' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', padding: '20px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const canvasWrapper = { position: 'relative', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', boxShadow: '0 0 40px rgba(0,0,0,0.8)' };
const vGuide = { position: 'absolute', top: 0, bottom: 0, width: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents:'none' };
const hGuide = { position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#00ff00', zIndex: 10, pointerEvents:'none' };
const emptyPreview = { color: '#444', marginTop: '150px', fontSize:'14px' };

export default Report;