import React, { useState, useEffect, useRef } from 'react';
// ✅ 수정: fabric 임포트 방식을 가장 안전한 방식으로 변경
import * as fabric from 'fabric'; 
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);

  // ✅ 버전 호환성을 위해 fabric 객체 추출
  // fabric.fabric으로 되어있거나 fabric 자체이거나를 대응합니다.
  const f = fabric.fabric || fabric;

  useEffect(() => {
    // 캔버스 초기화
    fabricCanvas.current = new f.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#333'
    });

    // 세팅값 불러오기
    const savedConfig = localStorage.getItem('fabric_report_config');
    if (savedConfig) {
      fabricCanvas.current.loadFromJSON(savedConfig, () => {
        fabricCanvas.current.renderAll();
      });
    }

    // 삭제 단축키
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.current.getActiveObjects();
        if (activeObjects.length > 0) {
          activeObjects.forEach(obj => fabricCanvas.current.remove(obj));
          fabricCanvas.current.discardActiveObject().renderAll();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.current.dispose();
    };
  }, [f]); // f가 변경될 때 대응 (보통 초기 1회)

  // 배경 설정 및 저장
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      f.Image.fromURL(event.target.result, (img) => {
        const canvas = fabricCanvas.current;
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

  const saveLayout = () => {
    const config = fabricCanvas.current.toJSON();
    localStorage.setItem('fabric_report_config', JSON.stringify(config));
    alert("💾 레이아웃과 배경이 저장되었습니다.");
  };

  // 요소 추가
  const addTextElement = (header) => {
    const text = new f.IText(header, {
      left: 100,
      top: 100,
      fontSize: 25,
      fontFamily: 'Nanum Gothic',
      fontWeight: 'bold',
      fill: '#000000'
    });
    text.set('dataKey', header); // 학생 데이터 매칭용
    fabricCanvas.current.add(text);
    fabricCanvas.current.setActiveObject(text);
  };

  const deleteSelected = () => {
    const activeObjects = fabricCanvas.current.getActiveObjects();
    activeObjects.forEach(obj => fabricCanvas.current.remove(obj));
    fabricCanvas.current.discardActiveObject().renderAll();
  };

  // 출력물 생성
  const handleZipDownload = async () => {
    const canvas = fabricCanvas.current;
    if (!canvas.backgroundImage) return alert("배경 이미지를 먼저 설정해주세요.");

    const res = await requestGAS({ action: 'getStudents' });
    const students = (res.data || res).filter(s => s.상태 === "재원");
    
    setProgress({ current: 0, total: students.length, status: 'processing' });
    const zip = new JSZip();
    const multiplier = 1 / canvas.backgroundImage.scaleX;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      canvas.getObjects('i-text').forEach(obj => {
        if (obj.get('dataKey')) {
          obj.set('text', String(student[obj.get('dataKey')] || obj.get('dataKey')));
        }
      });
      canvas.renderAll();

      const dataURL = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier });
      zip.file(`${student.이름}_성적표.jpg`, dataURL.split(',')[1], { base64: true });
      setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `성적표_패키지.zip`);
    setProgress({ current: 0, total: 0, status: 'idle' });
  };

  return (
    <div style={containerStyle}>
      <div style={headerSection}>
        <h2 style={{color: '#3b82f6', margin:0}}>성적표 에디터 Pro (Fabric)</h2>
        <div style={{display:'flex', gap:'10px'}}>
           <input type="file" onChange={handleImageUpload} accept="image/*" id="bg-upload" style={{display:'none'}} />
           <label htmlFor="bg-upload" style={topBtn}>📸 배경 설정</label>
           <button onClick={saveLayout} style={{...topBtn, backgroundColor: '#10b981'}}>💾 세팅 저장</button>
           <button onClick={handleZipDownload} disabled={progress.status !== 'idle'} style={{...topBtn, backgroundColor: '#f59e0b'}}>
             {progress.status !== 'idle' ? '⏳ 처리중...' : '📦 전체 압축다운'}
           </button>
        </div>
      </div>

      <div style={editorLayout}>
        <div style={sidePanel}>
          <h4 style={panelTitle}>항목 추가</h4>
          <div style={tagBox}>
            {headers.map(h => (
              <button key={h} onClick={() => addTextElement(h)} style={tagBtn}>{h} +</button>
            ))}
          </div>
          <h4 style={{...panelTitle, marginTop: '30px'}}>편집</h4>
          <button onClick={deleteSelected} style={deleteBtn}>🗑️ 선택 삭제</button>
        </div>
        <div style={previewArea}>
          <div style={canvasShadow}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 스타일 (생략 - 이전과 동일)
const deleteBtn = { width: '100%', padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
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

export default Report;