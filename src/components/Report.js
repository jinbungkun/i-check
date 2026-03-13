import React, { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric'; // fabric 라이브러리 임포트
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const canvasRef = useRef(null); // 실제 캔버스 엘리먼트
  const fabricCanvas = useRef(null); // Fabric 인스턴스 저장소

  // 1. 캔버스 초기화
  useEffect(() => {
    fabricCanvas.current = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#333'
    });

    // 자석(Snap) 기능 구현
    fabricCanvas.current.on('object:moving', (options) => {
      const SNAP_THRESHOLD = 10;
      const canvas = fabricCanvas.current;
      const target = options.target;

      canvas.getObjects().forEach((obj) => {
        if (obj === target || obj.type === 'image') return;
        
        // 좌측/상단 자석
        if (Math.abs(target.left - obj.left) < SNAP_THRESHOLD) target.set({ left: obj.left });
        if (Math.abs(target.top - obj.top) < SNAP_THRESHOLD) target.set({ top: obj.top });
      });
    });

    // 컴포넌트 언마운트 시 정리
    return () => fabricCanvas.current.dispose();
  }, []);

  // 2. 배경 이미지 설정 (비율 유지)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      fabric.Image.fromURL(f.target.result, (img) => {
        const canvas = fabricCanvas.current;
        // 캔버스 크기를 이미지 비율에 맞춤 (가로 800 기준)
        const scale = 800 / img.width;
        canvas.setDimensions({ width: 800, height: img.height * scale });
        
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: scale,
          scaleY: scale
        });
      });
    };
    reader.readAsDataURL(file);
  };

  // 3. 텍스트 요소 추가
  const addTextElement = (header) => {
    const text = new fabric.IText(header, {
      left: 100,
      top: 100,
      fontSize: 25,
      fontFamily: 'Nanum Gothic',
      fontWeight: 'bold',
      fill: '#000000',
      originX: 'left',
      originY: 'top',
      hasRotatingPoint: false // 회전은 불필요할 것 같아 껐습니다
    });
    // 커스텀 속성 추가 (나중에 데이터 매칭용)
    text.set('dataKey', header);
    fabricCanvas.current.add(text);
  };

  // 4. 고화질 이미지 생성 및 압축
  const handleZipDownload = async () => {
    const canvas = fabricCanvas.current;
    if (!canvas.backgroundImage) return alert("배경 이미지를 먼저 설정해주세요.");

    const students = fullStudents.length > 0 ? fullStudents : await loadData();
    if (!students.length) return alert("데이터가 없습니다.");

    setProgress({ current: 0, total: students.length, status: 'processing' });
    const zip = new JSZip();

    // 원본 크기로 뽑아내기 위해 배율 계산
    const multiplier = 1 / canvas.backgroundImage.scaleX;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // 캔버스의 모든 텍스트 객체를 학생 데이터로 교체
      canvas.getObjects('i-text').forEach(obj => {
        obj.set('text', String(student[obj.dataKey] || obj.dataKey));
      });
      canvas.renderAll();

      // 고화질 DataURL 생성
      const dataURL = canvas.toDataURL({
        format: 'jpeg',
        quality: 1,
        multiplier: multiplier // 중요: 이 값이 원본 해상도를 결정합니다
      });

      const base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, "");
      zip.file(`${student.이름}_성적표.jpg`, base64Data, { base64: true });
      setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `성적표_패키지.zip`);
    setProgress({ current: 0, total: 0, status: 'idle' });
  };

  const loadData = async () => {
    const res = await requestGAS({ action: 'getStudents' });
    const activeOnly = (res.data || res).filter(s => s.상태 === "재원");
    setFullStudents(activeOnly);
    return activeOnly;
  };

  return (
    <div style={containerStyle}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 Fabric Pro 💎</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 설정</label>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle'} style={{...topBtn, backgroundColor: '#f59e0b'}}>
             {progress.status !== 'idle' ? '⏳ 처리중...' : '📦 전체 압축다운'}
           </button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 클릭해서 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => addTextElement(h)} style={tagBtn}>{h} +</button>
            ))}
          </div>
          
          <div style={{marginTop:'30px', color:'#aaa', fontSize:'12px'}}>
            <p>💡 팁: 요소를 클릭하면 크기를 조절할 수 있습니다.</p>
            <p>💡 Delete키로 요소를 삭제하세요.</p>
          </div>
        </div>

        <div style={previewArea}>
          <div style={canvasShadow}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {progress.status !== 'idle' && (
        <div style={progressOverlay}>
           <div style={progressBox}>
              <h3>🖼️ 이미지 생성 중... ({progress.current}/{progress.total})</h3>
              <div style={progressBarContainer}><div style={{...progressBar, width: `${(progress.current/progress.total)*100}%`}} /></div>
           </div>
        </div>
      )}
    </div>
  );
}

// 스타일 정의 (간결화)
const containerStyle = { padding: '20px', color: '#fff', height: '100vh', backgroundColor:'#1a1c23', overflow:'hidden' };
const headerSection = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const topBtn = { padding: '8px 15px', borderRadius: '8px', color: '#fff', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'12px', backgroundColor:'#3b82f6' };
const editorLayout = { display: 'flex', gap: '20px', height: 'calc(100% - 80px)' };
const sidePanel = { width: '250px', backgroundColor: '#24262d', padding: '15px', borderRadius: '15px' };
const panelTitle = { fontSize: '14px', color: '#3b82f6', marginBottom: '15px' };
const tagBox = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
const tagBtn = { padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: 'transparent', cursor: 'pointer' };
const previewArea = { flex: 1, backgroundColor: '#111', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow:'auto' };
const canvasShadow = { boxShadow: '0 0 30px rgba(0,0,0,0.5)', border: '1px solid #333' };
const progressOverlay = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
const progressBox = { backgroundColor: '#24262d', padding: '30px', borderRadius: '20px', width: '300px', textAlign: 'center' };
const progressBarContainer = { width: '100%', height: '10px', backgroundColor: '#444', borderRadius: '5px', marginTop: '15px' };
const progressBar = { height: '100%', backgroundColor: '#3b82f6', borderRadius: '5px' };

export default Report;