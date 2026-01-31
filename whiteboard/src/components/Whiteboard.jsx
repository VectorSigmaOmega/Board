import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:5000");

// FIX 4: Better Color Generator (Prevents White/Light colors)
const getUserColor = () => {
    // Hue: 0-360 (any color)
    // Saturation: 100% (vibrant)
    // Lightness: 50% (ensures it is visible on white background)
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}, 100%, 50%)`;
};

const Whiteboard = () => {
  const { roomId } = useParams();
  const navigate = useNavigate(); // For the "Go Home" button
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  
  const [joined, setJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Use HSL color now
  const userColor = useRef(getUserColor());
  const lastPos = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!joined) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = userColor.current;
    ctxRef.current = ctx;

    const handleResize = () => {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [joined]);

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
    if (userName.trim() === "") return alert("Please enter a name");
    setJoined(true);
    socket.emit("join_room", { 
        name: userName, 
        color: userColor.current,
        roomId 
    });
  };

  const startDrawing = ({ nativeEvent }) => {
    if (nativeEvent.button !== 0) return;
    const { offsetX, offsetY } = nativeEvent;
    
    ctxRef.current.strokeStyle = userColor.current;
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
      color: userColor.current,
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
        <div className="bg-white p-10 rounded-xl shadow-2xl text-center w-96 border border-gray-200">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Join Room</h1>
            <div className="bg-gray-100 p-2 rounded mb-6 flex justify-between items-center">
                <span className="text-xs font-mono text-gray-500 truncate w-32">{roomId}</span>
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        alert("ID Copied!");
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline"
                >
                    Copy ID
                </button>
            </div>
            
            <div className="mb-6">
                <div 
                    className="w-16 h-16 rounded-full mx-auto mb-2 border-4 border-gray-200" 
                    style={{ backgroundColor: userColor.current }}
                ></div>
                <p className="text-xs text-gray-400">Your assigned color</p>
            </div>

            <input 
                type="text" 
                placeholder="Enter your Name"
                className="border-2 border-gray-200 p-3 rounded-lg w-full mb-6 text-lg focus:outline-none focus:border-blue-500"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            <button 
                onClick={joinRoom}
                className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 w-full transition-transform active:scale-95"
            >
                Enter Room
            </button>
             {/* FIX 2: Back Button */}
            <button 
                onClick={() => navigate('/')}
                className="mt-4 text-sm text-gray-500 hover:text-black underline"
            >
                &larr; Back to Home
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-2 rounded-full shadow-xl border border-gray-200 z-50 flex gap-4 items-center">
        <div className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: userColor.current }}></div>
        <div className="border-l border-gray-300 h-6"></div>
        <button className="p-2 hover:bg-gray-100 rounded-full text-red-500 font-bold transition-colors" onClick={clearCanvas}>🗑️ Clear Board</button>
        <div className="border-l border-gray-300 h-6"></div>
        {/* FIX 2: Exit Button */}
        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 font-bold transition-colors" onClick={() => navigate('/')}>Exit</button>
      </div>

      <div className="fixed top-4 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 z-40">
        <h3 className="font-bold text-gray-500 text-xs uppercase mb-3 tracking-wider">Online ({usersList.length})</h3>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {usersList.map((u, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: u.color}}></span>
                    <span className="truncate max-w-[100px]">{u.name} {u.name === userName ? "(You)" : ""}</span>
                </div>
            ))}
        </div>
        
        {/* FIX 3: Copy ID Only */}
        <div className="mt-4 pt-3 border-t border-gray-100">
             <button 
                onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    alert("Room ID Copied!");
                }}
                className="text-xs text-blue-500 hover:text-blue-700 font-bold w-full text-left"
            >
                📋 Copy Room ID
            </button>
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