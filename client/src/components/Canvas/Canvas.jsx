import { useEffect, useRef, useState } from "react";

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#a16207", "#64748b",
];

export default function Canvas({ roomCode, isDrawer, socket }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState("pen"); // pen | eraser

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawLine = (ctx, x0, y0, x1, y1, strokeColor, size, emit) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    if (emit) {
      socket.emit("draw", {
        roomCode,
        drawData: { x0, y0, x1, y1, color: strokeColor, size },
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Receive drawing from others
    socket.on("draw", (data) => {
      drawLine(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.size, false);
    });

    socket.on("clear_canvas", () => {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("turn_start", () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

    return () => {
      socket.off("draw");
      socket.off("clear_canvas");
      socket.off("turn_start"); 
    };

        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDraw = (e) => {
    if (!isDrawer) return;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!isDrawing.current || !isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    const strokeColor = tool === "eraser" ? "#1f2937" : color;

    drawLine(ctx, lastPos.current.x, lastPos.current.y, pos.x, pos.y, strokeColor, brushSize, true);
    lastPos.current = pos;
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear_canvas", { roomCode });
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xl">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className={`rounded-xl w-full border-2 ${isDrawer ? "border-yellow-400 cursor-crosshair" : "border-gray-700 cursor-not-allowed"}`}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* Toolbar */}
      {isDrawer && (
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 w-full flex flex-wrap items-center gap-3">
          {/* Colors */}
          <div className="flex flex-wrap gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("pen"); }}
                className={`w-6 h-6 rounded-full border-2 transition ${color === c && tool === "pen" ? "border-white scale-125" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Brush size */}
          <input
            type="range" min={2} max={30} value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-yellow-400"
          />

          {/* Tools */}
          <button
            onClick={() => setTool("eraser")}
            className={`px-3 py-1 rounded-lg text-sm font-bold transition ${tool === "eraser" ? "bg-yellow-400 text-gray-950" : "bg-gray-800 text-white"}`}
          >
            ⌫ Eraser
          </button>
          <button
            onClick={clearCanvas}
            className="px-3 py-1 rounded-lg text-sm font-bold bg-red-900 hover:bg-red-700 text-white transition"
          >
            🗑 Clear
          </button>
        </div>
      )}
    </div>
  );
}