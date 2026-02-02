import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:5000");

const getUserColor = () => {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}, 100%, 50%)`;
};

// --- Helper Component: Copy Button ---
const CopyButton = ({ textToCopy, className = "" }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    return (
        <button 
            onClick={handleCopy}
            className={`transition-all hover:scale-110 active:scale-95 ${className}`}
            title="Copy Room ID"
        >
            {copied ? (
                // Tick Icon
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                // Copy Icon
                <svg className="w-5 h-5 text-gray-400 hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );
};

const Whiteboard = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  
  const [joined, setJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Validation State
  const [inputError, setInputError] = useState(false);

  const [userColor] = useState(getUserColor());
  const lastPos = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!joined) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = userColor;
    ctxRef.current = ctx;

    const handleResize = () => {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [joined, userColor]);

  useEffect(() => {
    if (!joined) return;

    socket.on("load_history", (history) => {
        const ctx = ctxRef.current;
        if(!ctx) return;
        history.forEach(item => {
            const originalColor = ctx.strokeStyle;
            ctx.strokeStyle = item.color;
            ctx.beginPath();
            ctx.moveTo(item.prevX, item.prevY);
            ctx.lineTo(item.currX, item.currY);
            ctx.stroke();
            ctx.strokeStyle = originalColor;
        });
    });

    socket.on("draw_line", (data) => {
      const { prevX, prevY, currX, currY, color } = data;
      const ctx = ctxRef.current;
      if (!ctx) return;

      const originalColor = ctx.strokeStyle;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      ctx.strokeStyle = originalColor;
    });

    socket.on("clear_canvas", () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });

    socket.on("update_users", (data) => {
        setUsersList(data);
    });

    socket.on("room_full", () => {
        alert("Room is full!");
        setJoined(false);
        navigate('/');
    });
    
    return () => {
        socket.off("draw_line");
        socket.off("clear_canvas");
        socket.off("update_users");
        socket.off("load_history");
        socket.off("room_full");
    };
  }, [joined, navigate]);

  const joinRoom = () => {
    if (userName.trim() === "") {
        // Validation Microinteraction
        setInputError(true);
        setTimeout(() => setInputError(false), 200);
        return;
    }
    setJoined(true);
    socket.emit("join_room", { 
        name: userName, 
        color: userColor,
        roomId 
    });
  };

  const startDrawing = ({ nativeEvent }) => {
    if (nativeEvent.button !== 0) return;
    const { offsetX, offsetY } = nativeEvent;
    
    ctxRef.current.strokeStyle = userColor;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    lastPos.current = { x: offsetX, y: offsetY };
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();

    socket.emit("draw_line", {
      prevX: lastPos.current.x,
      prevY: lastPos.current.y,
      currX: offsetX,
      currY: offsetY,
      color: userColor,
      roomId,
    });

    lastPos.current = { x: offsetX, y: offsetY };
  };

  const stopDrawing = () => {
    if (ctxRef.current) ctxRef.current.closePath();
    setIsDrawing(false);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear_canvas", roomId);
  };

  // --- RENDER ---
  if (!joined) {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <div 
            className="bg-white p-10 rounded-xl shadow-xl w-full max-w-sm border border-gray-200 flex flex-col justify-between relative" 
            style={{ height: '480px' }}
        >
            {/* Back arrow */}
            <button 
                onClick={() => navigate('/')}
                className="absolute top-5 left-5 text-gray-400 hover:text-black transition-colors"
            >
                <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.5 15L7.5 10L12.5 5" />
                </svg>
            </button>

            {/* Header */}
            <div className="text-center mt-8">
                <h1 className="text-3xl font-bold mb-2 text-gray-800">Join Room</h1>
                <div className="bg-gray-100 p-2 rounded flex justify-between items-center">
                    <span className="text-xs font-mono text-gray-500">{roomId}</span>
                    {/* Replaced Text Button with Icon Component */}
                    <CopyButton textToCopy={roomId} />
                </div>
            </div>

            {/* Color swatch */}
            <div className="text-center">
                <div 
                    className="w-16 h-16 rounded-full mx-auto mb-2 border-4 border-gray-200 shadow-inner" 
                    style={{ backgroundColor: userColor }}
                ></div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Your Color</p>
            </div>

            {/* Name input + Enter button */}
            <div className="flex flex-col gap-3">
                <input 
                    type="text" 
                    placeholder="Enter your Name"
                    // Conditional Error Class
                    className={`input-field text-center font-mono text-sm ${inputError ? 'border-black ring-1 ring-black' : ''}`}
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                />
                <button 
                    onClick={joinRoom}
                    className="btn-primary"
                >
                    Enter Room
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-2 rounded-full shadow-xl border border-gray-200 z-50 flex gap-4 items-center">
        <div className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: userColor }}></div>
        <div className="border-l border-gray-300 h-6"></div>
        <button className="p-2 hover:bg-gray-100 rounded-full text-red-500 font-bold transition-colors" onClick={clearCanvas}>🗑️ Clear Board</button>
        <div className="border-l border-gray-300 h-6"></div>
        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 font-bold transition-colors" onClick={() => navigate('/')}>Exit</button>
      </div>

      <div className="fixed top-4 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 z-40">
        <h3 className="font-bold text-gray-500 text-xs uppercase mb-3 tracking-wider">Online ({usersList.length})</h3>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {usersList.map((u, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: u.color}}></span>
                    <span className="truncate max-w-25">{u.name} {u.name === userName ? "(You)" : ""}</span>
                </div>
            ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
             <span className="text-xs font-bold text-gray-400 uppercase">Room ID</span>
             {/* Replaced Text Button with Icon Component */}
             <CopyButton textToCopy={roomId} />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onContextMenu={(e) => e.preventDefault()} 
        className="absolute top-0 left-0 cursor-crosshair touch-none"
      />
    </div>
  );
};

export default Whiteboard;