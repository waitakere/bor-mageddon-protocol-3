import React, { useEffect, useState } from 'react';

export const StartScreen = ({ onStart }: { onStart: () => void }) => {
    const [particles, setParticles] = useState<{ id: number; left: string; delay: string; duration: string; size: string }[]>([]);

    useEffect(() => {
        // Generate 30 random upward-falling red particles
        const newParticles = Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}vw`,
            delay: `${Math.random() * 5}s`,
            duration: `${4 + Math.random() * 6}s`,
            size: `${2 + Math.random() * 4}px`
        }));
        setParticles(newParticles);
    }, []);

    return (
        <div className="relative w-full h-screen bg-black flex justify-center items-center overflow-hidden">
            
            {/* 1. CRT & Scanline Overlays */}
            <div className="scanlines"></div>
            <div className="crt-overlay"></div>

            {/* 2. Upward Falling Red Particles */}
            {particles.map(p => (
                <div 
                    key={p.id} 
                    className="particle"
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        width: p.size,
                        height: p.size
                    }}
                />
            ))}

            {/* 3. The Main UI Box */}
            <div className="start-box flex flex-col items-center">
                
                {/* Metal Mania Title */}
                <h1 className="font-metal text-6xl md:text-8xl mb-4">
                    BOR-MAGEDDON
                </h1>
                
                {/* Space Mono Subtitle */}
                <h2 className="font-mono-title text-xl md:text-2xl text-gray-400 mb-12">
                    [TERMINAL_01]
                </h2>

                <hr className="w-full border-t border-red-900 mb-8 opacity-50" />

                {/* The Big Red Button */}
                <button 
                    id="initialize-btn" 
                    onClick={onStart}
                >
                    INITIALIZE PROTOCOL
                </button>

                <p className="mt-8 text-green-500 font-mono text-sm tracking-widest animate-pulse">
                    ESTABLISHING SECURE CONNECTION...
                </p>
            </div>
        </div>
    );
};