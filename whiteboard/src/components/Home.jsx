import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast, { Toaster } from 'react-hot-toast'; // Optional: for nice alerts, or use standard alert()
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const createRoom = () => {
    const id = uuidv4();
    navigate(`/${id}`);
  };

  const joinRoom = () => {
    if(!roomId.trim()) {
        alert("Please enter a Room ID"); 
        return;
    }
    navigate(`/${roomId}`);
  };

  return (
    <div className="flex items-center justify-center h-screen font-sans">
      {/* Container with white background to stand out against the dot grid */}
      <div className="bg-white p-10 rounded-xl shadow-2xl w-96 border border-gray-200">
        <h1 className="text-4xl font-bold mb-2 text-gray-800 text-center">Whiteboard</h1>
        <p className="text-gray-500 mb-8 text-center text-sm">Real-time collaborative engineering.</p>

        {/* Option 1: Create */}
        <div className="mb-8">
            <button 
                onClick={createRoom}
                className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-all active:scale-95"
            >
                Create New Room
            </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Or Join Existing</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Option 2: Join */}
        <div className="flex flex-col gap-3">
            <input 
                type="text" 
                placeholder="Enter Room ID"
                className="border-2 border-gray-200 p-3 rounded-lg focus:outline-none focus:border-black transition-colors text-center font-mono text-sm"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <button 
                onClick={joinRoom}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95"
            >
                Join Room
            </button>
        </div>
      </div>
    </div>
  );
};

export default Home;