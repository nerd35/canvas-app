// pages/index.tsx (or app/page.tsx)
"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

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
  const [activeButton, setActiveButton] = useState(null);

  const handleButtonClick = (buttonName: any) => {
    setActiveButton(buttonName);
    if (buttonName === "undo") undo();
    else if (buttonName === "redo") redo();
    else if (buttonName === "clear") clearCanvas();
    else handleToolChange(buttonName); // for tools
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctxRef.current = ctx;
        loadLayer();
      }
    }
  }, [color, brushSize, activeLayer]);

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
  const startDrawing = (e: React.MouseEvent) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (tool === "brush") {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.clearRect(offsetX - brushSize / 2, offsetY - brushSize / 2, brushSize, brushSize);
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newLayers = [...layers];
    newLayers[activeLayer].data = canvas.toDataURL();
    setLayers(newLayers);

    setHistory([...history, canvas.toDataURL()]);
    setRedoStack([]);
    setIsDrawing(false);
  };

  const handleToolChange = (t: string) => {
    setTool(t);
  };

  const handleColorChange = (c: string) => {
    setColor(c);
  };

  const handleBrushSizeChange = (size: number) => {
    setBrushSize(size);
  };

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
  const addLayer = () => {
    const newId = layers.length + 1;
    setLayers([...layers, { id: newId, name: `Layer ${newId}`, data: "" }]);
  };

  const selectLayer = (index: number) => {
    setActiveLayer(index);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-white shadow">
        <h1 className="text-xl font-bold">🎨 Drawing App</h1>
        <button
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition"
          onClick={saveImage}
        >
          Save as Image
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: 0 }}
          className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-4"
        >
          {tools.map((t) => (
            <button
              key={t}
              className={`w-10 h-10 rounded flex items-center justify-center text-2xl ${activeButton === t ? "bg-indigo-500 text-white" : "bg-transparent text-gray-700"
                }`}
              onClick={() => handleButtonClick(t)}
            >
              {t === "brush" && "🖌️"}
              {t === "rectangle" && <span className="text-3xl">▭</span>}
              {t === "circle" && "⚪"}
              {t === "eraser" && "🧽"}
            </button>
          ))}

          <button
            onClick={() => handleButtonClick("undo")}
            className={`w-10 h-10 rounded flex items-center justify-center text-2xl ${activeButton === "undo" ? "bg-indigo-500 text-white" : "bg-transparent text-gray-700"
              }`}
          >
            ↺
          </button>

          <button
            onClick={() => handleButtonClick("redo")}
            className={`w-10 h-10 rounded flex items-center justify-center text-2xl ${activeButton === "redo" ? "bg-indigo-500 text-white" : "bg-transparent text-gray-700"
              }`}
          >
            ↻
          </button>

          <button
            onClick={() => handleButtonClick("clear")}
            className={`w-10 h-10 rounded flex items-center justify-center text-2xl ${activeButton === "clear" ? "bg-indigo-500 text-white" : "bg-transparent text-red-700"
              }`}
          >
            🗑️
          </button>

        </motion.div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            className="w-full h-full cursor-crosshair"
          />
        </div>

        {/* Layers Panel */}
        <div className="w-40 bg-gray-50 border-l flex flex-col">
          <div className="p-2 text-sm font-semibold border-b">Layers</div>
          <div className="flex-1 overflow-auto">
            {layers.map((layer, index) => (
              <button
                key={layer.id}
                onClick={() => selectLayer(index)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-200 ${index === activeLayer ? "bg-indigo-100 font-bold" : ""
                  }`}
              >
                {layer.name}
              </button>
            ))}
          </div>
          <button
            onClick={addLayer}
            className="m-2 py-1 px-2 rounded bg-indigo-500 text-white hover:bg-indigo-400 transition"
          >
            + Add Layer
          </button>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="p-3 bg-white border-t flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
        <h1>Select color</h1>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-indigo-500" : ""
                }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max={maxBrushSize}
            value={brushSize}
            onChange={(e) => handleBrushSizeChange(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm">Size: {brushSize}</span>
        </div>
      </div>
    </div>
  );
}
