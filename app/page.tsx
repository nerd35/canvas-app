"use client";
import React, { useRef, useState, useEffect } from "react";

const colors = ["#000000", "#FF6363", "#FFA600", "#00876C", "#3366FF", "#CBAACB"];
const tools = ["brush", "rectangle", "circle", "eraser"];
const maxBrushSize = 30;

export default function DrawingApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [layers, setLayers] = useState([{ id: 1, name: "Layer 1", data: "" }]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [showMobileLayers, setShowMobileLayers] = useState(false);

  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName);
    if (buttonName === "undo") undo();
    else if (buttonName === "redo") redo();
    else if (buttonName === "clear") clearCanvas();
    else handleToolChange(buttonName);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctxRef.current = ctx;
        loadLayer();
      }
    }
  }, [activeLayer]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const loadLayer = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const img = new Image();
    img.src = layers[activeLayer].data;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const getEventPos = (e?: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (e && "touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e && "changedTouches" in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if (e && "clientX" in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return startPos ? { offsetX: startPos.x, offsetY: startPos.y } : { offsetX: 0, offsetY: 0 };
    }

    return { offsetX: clientX - rect.left, offsetY: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { offsetX, offsetY } = getEventPos(e);
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    if (tool === "brush") {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
    setStartPos({ x: offsetX, y: offsetY });
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPos) return;
    const { offsetX, offsetY } = getEventPos(e);
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    if (tool === "brush") {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.clearRect(offsetX - brushSize / 2, offsetY - brushSize / 2, brushSize, brushSize);
    }
  };

  const endDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    if (!isDrawing || !startPos) return;

    const { offsetX, offsetY } = e ? getEventPos(e) : { offsetX: startPos.x, offsetY: startPos.y };
    const { x, y } = startPos;

    if (tool === "rectangle" || tool === "circle") {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      if (tool === "rectangle") {
        ctx.strokeRect(x, y, offsetX - x, offsetY - y);
      } else if (tool === "circle") {
        const radius = Math.hypot(offsetX - x, offsetY - y);
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    const newLayers = [...layers];
    newLayers[activeLayer].data = canvas.toDataURL();
    setLayers(newLayers);

    setHistory([...history, canvas.toDataURL()]);
    setRedoStack([]);
    setIsDrawing(false);
    setStartPos(null);
  };

  const handleToolChange = (t: string) => setTool(t);
  const handleColorChange = (c: string) => setColor(c);
  const handleBrushSizeChange = (size: number) => setBrushSize(size);
  const addLayer = () => {
    const newId = layers.length + 1;
    setLayers([...layers, { id: newId, name: `Layer ${newId}`, data: "" }]);
  };
  const selectLayer = (index: number) => setActiveLayer(index);

  const undo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const last = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);
    setHistory(newHistory);
    setRedoStack([layers[activeLayer].data, ...redoStack]);
    const img = new Image();
    img.src = newHistory[newHistory.length - 1] || "";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const newLayers = [...layers];
      newLayers[activeLayer].data = img.src;
      setLayers(newLayers);
    };
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const next = redoStack[0];
    const newRedoStack = redoStack.slice(1);
    setRedoStack(newRedoStack);
    setHistory([...history, next]);
    const img = new Image();
    img.src = next;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const newLayers = [...layers];
      newLayers[activeLayer].data = img.src;
      setLayers(newLayers);
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const newLayers = [...layers];
    newLayers[activeLayer].data = "";
    setLayers(newLayers);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900">
      <nav className="flex items-center justify-between px-6 py-3 bg-white shadow">
        <h1 className="text-xl font-bold">🎨 Drawing App</h1>
        <button className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition" onClick={saveImage}>
          Save as Image
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
        <div className="sm:flex hidden w-14 bg-white border-r flex-col items-center py-3 space-y-3">
          {[...tools, "undo", "redo", "clear"].map((btn) => (
            <button key={btn} onClick={() => handleButtonClick(btn)} className={`w-9 h-9 rounded flex items-center justify-center text-xl ${activeButton === btn ? "bg-indigo-500 text-white" : "bg-transparent text-gray-700"}`}>
              {btn === "brush" && "🖌️"}
              {btn === "rectangle" && <span className="text-2xl">▭</span>}
              {btn === "circle" && "⚪"}
              {btn === "eraser" && "🧽"}
              {btn === "undo" && "↺"}
              {btn === "redo" && "↻"}
              {btn === "clear" && "🗑️"}
            </button>
          ))}
        </div>

        <div className="flex-1 relative bg-white">
          <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing} className="w-full h-full cursor-crosshair touch-none block" />
        </div>

        <div className="w-40 bg-gray-50 border-l flex flex-col sm:block hidden">
          <div className="p-2 flex justify-between items-center text-sm font-semibold border-b">
            <span>Layers</span>
            <button onClick={addLayer} className="py-0.5 px-2 rounded bg-indigo-500 text-white hover:bg-indigo-400 text-xs">+ Add</button>
          </div>
          <div className="flex-1 overflow-auto">
            {layers.map((layer, index) => (
              <button key={layer.id} onClick={() => selectLayer(index)} className={`w-full text-left px-3 py-2 hover:bg-gray-200 ${index === activeLayer ? "bg-indigo-100 font-bold" : ""}`}>{layer.name}</button>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE LAYER PANEL BUTTON */}
      <div className="sm:hidden fixed top-20 right-4 z-50">
        <button onClick={() => setShowMobileLayers(true)} className="px-3 py-2 bg-indigo-500 text-white rounded shadow">Layers</button>
      </div>

      {/* MOBILE LAYER PANEL FULL SCREEN */}
      {showMobileLayers && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-semibold">Layers</h2>
            <button onClick={() => setShowMobileLayers(false)} className="text-indigo-500 text-sm">Close ✕</button>
          </div>
          <div className="flex justify-between items-center p-2 border-b">
            <span className="font-medium">Manage Layers</span>
            <button onClick={addLayer} className="py-1 px-2 rounded bg-indigo-500 text-white hover:bg-indigo-400 text-sm">+ Add</button>
          </div>
          <div className="flex-1 overflow-auto">
            {layers.map((layer, index) => (
              <button key={layer.id} onClick={() => { selectLayer(index); setShowMobileLayers(false); }} className={`block w-full text-left px-4 py-3 border-b hover:bg-gray-100 ${index === activeLayer ? "bg-indigo-100 font-bold" : ""}`}>{layer.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-white border-t flex flex-wrap items-center gap-2 justify-between sm:mb-0 mb-14">
        <div className="flex items-center gap-2">
          <h1>Select color</h1>
          {colors.map((c) => (
            <button key={c} onClick={() => handleColorChange(c)} className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-indigo-500" : ""}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <h1>Brush size</h1>
          <input type="range" min="1" max={maxBrushSize} value={brushSize} onChange={(e) => handleBrushSizeChange(Number(e.target.value))} className="w-32" />
          <span className="text-sm">Size: {brushSize}</span>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50">
        {[...tools, "undo", "redo", "clear"].map((btn) => (
          <button key={btn} onClick={() => handleButtonClick(btn)} className={`flex flex-col items-center text-xs ${activeButton === btn ? "text-indigo-600" : "text-gray-700"}`}>
            <span className="text-xl">
              {btn === "brush" && "🖌️"}
              {btn === "rectangle" && <span className="text-2xl">▭</span>}
              {btn === "circle" && "⚪"}
              {btn === "eraser" && "🧽"}
              {btn === "undo" && "↺"}
              {btn === "redo" && "↻"}
              {btn === "clear" && "🗑️"}
            </span>
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
