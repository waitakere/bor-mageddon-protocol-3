import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
}

// Defining character stats for the UI Card
const CHARACTER_DB: Record<string, { name: string; desc: string; spd: number; pwr: number; occupation: string; weapon: string }> = {
  marko: {
    name: "MARKO",
    occupation: "RTB ELECTRICIAN",
    weapon: "CHAIN-LINK BELT",
    desc: "Fired for attempting to unionize the copper mines. Now he is here to dismantle the corrupt RTB management piece by piece.",
    spd: 50,
    pwr: 80
  },
  maja: {
    name: "MAJA",
    occupation: "UNDERGROUND COURIER",
    weapon: "LEAD PIPE",
    desc: "Lost her life savings to the hyperinflation banks. She moves fast, hits hard, and takes no prisoners.",
    spd: 90,
    pwr: 50
  },
  darko: {
    name: "DARKO",
    occupation: "BLACK MARKET SMUGGLER",
    weapon: "FORBIDDEN CASSETTES",
    desc: "Street-smart smuggler. Quick on his feet, carries forbidden cassette tapes and a bad attitude.",
    spd: 85,
    pwr: 50
  }
};

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // React State for UI Overlays
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // ==========================================
    // 1. THREE.JS SCENE SETUP
    // ==========================================
    const scene = new THREE.Scene();
    // Transparent background so the HTML scanlines and embers from App.tsx show through!
    scene.background = null; 
    scene.fog = new THREE.FogExp2(0x050404, 0.05);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting (Adjusted to brutalist red/white)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const spotLight = new THREE.SpotLight(0xff3333, 50); // Deep red tint
    spotLight.position.set(0, 5, 5);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.5;
    scene.add(spotLight);

    // ==========================================
    // 2. THE 3D CAROUSEL
    // ==========================================
    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);

    const characters = ['marko', 'maja', 'darko'];
    const radius = 3.5; // Slightly wider radius

    characters.forEach((char, index) => {
      const angle = (index / characters.length) * Math.PI * 2;
      
      const geometry = new THREE.BoxGeometry(1.5, 2.5, 0.2);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        metalness: 0.8,
        roughness: 0.2,
        emissive: index === 0 ? 0xff3333 : 0x000000, // Highlight Marko in RED initially
        emissiveIntensity: 0.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.rotation.y = -angle + Math.PI / 2;
      
      mesh.userData = { characterName: char }; 
      carouselGroup.add(mesh);
    });

    // ==========================================
    // 3. INTERACTIVITY
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y
        };
        carouselGroup.rotation.y += deltaMove.x * 0.01;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(carouselGroup.children);
      
      if (intersects.length > 0) {
        const clickedChar = intersects[0].object.userData.characterName;
        setActiveCard(clickedChar);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // 4. ANIMATION LOOP
    // ==========================================
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isDragging && !activeCard) {
        carouselGroup.rotation.y += 0.002;
      }
      carouselGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeCard]);

  const handleInitialize = () => {
    setIsInitialized(true);
  };

  const handleDeployment = () => {
    if (activeCard) {
      onSelect(activeCard);
    }
  };

  const currentStats = activeCard ? CHARACTER_DB[activeCard] : null;

  return (
    <div className="absolute inset-0 w-full h-full text-white font-mono pointer-events-none select-none z-10">
      
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full -z-10 pointer-events-auto cursor-grab active:cursor-grabbing" />

      {/* =========================================
          STEP 1: INITIALIZATION OVERLAY (The Title Screen)
      ========================================= */}
      {!isInitialized && (
        <div id="start-overlay" className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 pointer-events-auto backdrop-blur-sm">
          <div className="start-box flex flex-col items-center w-full max-w-3xl animate-in fade-in zoom-in duration-500">
            <h1 className="font-metal text-white text-6xl md:text-8xl tracking-widest drop-shadow-[4px_4px_0px_#ff3333] mb-4">
                BOR-MAGEDDON
            </h1>
            <h2 className="font-mono-title text-xl md:text-2xl text-gray-400 mb-12">
                [TERMINAL_01]
            </h2>
            <hr className="w-full border-t border-red-900 mb-8 opacity-50" />
            <button 
                id="initialize-btn" 
                onClick={handleInitialize}
                className="bg-[#ff3333] border-none px-10 py-5 cursor-pointer shadow-[8px_8px_0px_#660000] text-xl mt-8 font-mono font-bold text-black uppercase tracking-widest hover:bg-white hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_#999] transition-all"
            >
                INITIALIZE PROTOCOL
            </button>
            <p className="mt-8 text-green-500 font-mono text-sm tracking-widest animate-pulse">
                ESTABLISHING SECURE CONNECTION...
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          STEP 2: TERMINAL HEADER (Visible after init)
      ========================================= */}
      {isInitialized && (
        <div id="terminal-header" className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-black/80 border-b border-red-900/50 pointer-events-auto backdrop-blur-sm z-20">
          <div id="hint" className="text-sm font-bold text-red-500 animate-pulse tracking-widest">
            SYSTEM_STATUS: [DRAG_TO_ROTATE] // [CLICK_CARD_FOR_ARCHIVE]
          </div>
          <div id="audio-controls">
            <button 
              onClick={() => setAudioOn(!audioOn)}
              className="text-xs font-bold border border-red-900 px-4 py-2 bg-black hover:bg-red-600 hover:text-white transition-colors cursor-pointer tracking-widest"
            >
              AUDIO: [{audioOn ? 'ON' : 'OFF'}]
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          STEP 3: EXPANDED CHARACTER CARD
      ========================================= */}
      {isInitialized && activeCard && currentStats && (
        <div id="expanded-card" className="absolute bottom-12 right-12 w-96 bg-[#1a0a05] border-4 border-double border-[#ff3333] p-8 z-30 pointer-events-auto shadow-[20px_20px_0px_#000] transition-all animate-in fade-in slide-in-from-right-10">
          
          <button 
            onClick={() => setActiveCard(null)}
            className="absolute top-4 right-4 bg-[#ff3333] text-black border-none font-bold px-3 py-1 cursor-pointer hover:bg-white"
          >
            X
          </button>
          
          <div className="card-header border-b border-red-900/50 pb-4 mb-4 mt-4">
            <span className="text-[10px] text-green-500 block mb-2 tracking-widest font-bold">DE-ENCRYPTION SUCCESSFUL</span>
            <h2 className="font-metal text-5xl text-white drop-shadow-[3px_3px_0px_#ff3333] tracking-wider uppercase">{currentStats.name}</h2>
            <p className="text-red-500 text-xs tracking-widest mt-2 font-bold">// {currentStats.occupation}</p>
          </div>
          
          <p className="text-sm text-gray-300 mb-6 leading-relaxed h-20">
            {currentStats.desc}
          </p>
          
          <div className="flex gap-6 mb-8 text-sm font-bold border border-red-900/50 p-4 bg-black/50">
            <div className="stat flex-1 text-gray-500">SPD: <span className="text-red-500 text-lg ml-2">{currentStats.spd}</span></div>
            <div className="stat flex-1 text-gray-500">PWR: <span className="text-red-500 text-lg ml-2">{currentStats.pwr}</span></div>
          </div>
          
          <button 
            onClick={handleDeployment}
            className="w-full bg-[#ff3333] text-black py-4 text-lg hover:bg-white font-bold border-none cursor-pointer shadow-[6px_6px_0px_#660000] transition-all tracking-widest"
          >
            DEPLOY TO BOR
          </button>
        </div>
      )}
    </div>
  );
};