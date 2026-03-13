import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric'; // 빌드 에러 해결을 위한 import 방식
import { requestGAS } from '../utils/GoogleAppScript';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function Report({ headers }) {
  const [fullStudents, setFullStudents] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);

  useEffect(() => {
    // 캔버스 초기화
    fabricCanvas.current = new fabric.fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#333'
    });

    // 삭제 기능: Delete 키를 누르면 선택된 객체 삭제
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

    // 1-2. 기존 세팅값 불러오기 (배경 포함)
    const savedConfig = localStorage.getItem('fabric_report_config');
    if (savedConfig) {
      fabricCanvas.current.loadFromJSON(savedConfig, () => {
        fabricCanvas.current.renderAll();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.current.dispose();
    };
  }, []);

  // 1-1. 배경넣고 세팅값 저장하기
  const saveLayout = () => {
    // 캔버스의 모든 상태(객체, 배경이미지 위치 등)를 JSON으로 저장
    const config = fabricCanvas.current.toJSON();
    localStorage.setItem('fabric_report_config', JSON.stringify(config));
    alert("💾 배경과 레이아웃이 안전하게 저장되었습니다.");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      fabric.fabric.Image.fromURL(f.target.result, (img) => {
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

  // 2. 카테고리 추가
  const addTextElement = (header) => {
    const text = new fabric.fabric.IText(header, {
      left: 100,
      top: 100,
      fontSize: 25,
      fontFamily: 'Nanum Gothic',
      fontWeight: 'bold',
      fill: '#000000',
      dataKey: header // 데이터 매칭용 키
    });
    fabricCanvas.current.add(text);
    fabricCanvas.current.setActiveObject(text); // 추가하자마자 선택 상태로 (삭제 쉽게)
  };

  // 선택된 요소 삭제 버튼용 함수
  const deleteSelected = () => {
    const activeObjects = fabricCanvas.current.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => fabricCanvas.current.remove(obj));
      fabricCanvas.current.discardActiveObject().renderAll();
    } else {
      alert("삭제할 항목을 먼저 선택해주세요.");
    }
  };

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
        if (obj.dataKey) {
          obj.set('text', String(student[obj.dataKey] || obj.dataKey));
        }
      });
      canvas.renderAll();

      const dataURL = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier });
      const base64Data = dataURL.replace(/^data:image\/jpeg;base64,/, "");
      zip.file(`${student.이름}_성적표.jpg`, base64Data, { base64: true });
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
          
          <h4 style={{...panelTitle, marginTop: '30px'}}>편집 도구</h4>
          <button onClick={deleteSelected} style={deleteBtn}>🗑️ 선택 항목 삭제</button>
          
          <div style={infoBox}>
            <p>• 항목 클릭 후 <b>Delete</b>키로 삭제 가능</p>
            <p>• 배경이미지도 저장 버튼을 눌러야 유지됩니다.</p>
          </div>
        </div>

        <div style={previewArea}>
          <div style={canvasShadow}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
      {/* progress overlay 생략 (기존과 동일) */}
    </div>
  );
}

// 추가된 스타일
const deleteBtn = { width: '100%', padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const infoBox = { marginTop:'20px', color:'#888', fontSize:'11px', lineHeight:'1.6' };
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