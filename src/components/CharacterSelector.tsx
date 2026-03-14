import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
}

const THEME = { bg: 0x050404, fog: 0x1a0a05, particle: 0xff3333, ambient: 0xffffff, point: 0xff4422 };
const RAW_URL = 'https://raw.githubusercontent.com/ivanatag/bor-mageddon-protocol-2/main/public/assets/images/characters/';
const BGM_URL = 'https://raw.githubusercontent.com/ivanatag/bor-mageddon-protocol-2/main/public/assets/audio/bgm/bormageddon-character-menu-soundtrack.wav';

// Character stats data updated to match user request
const CARDS_DATA = [
  { 
    id: 'marko', title: 'MARKO', accent: '#ff3333', spd: 50, pwr: 50, gradient: ['#3a1010', '#150505'], label: 'CLASS: BRAWLER', file: 'marko_idle.png', 
    desc: 'Local basketball prodigy. Balanced speed and power. Ideal for maintaining the front lines in Bor.' 
  },
  { 
    id: 'maja', title: 'MAJA', accent: '#44ff44', spd: 30, pwr: 95, gradient: ['#103a15', '#051505'], label: 'CLASS: ENFORCER', file: 'maja_idle.png', 
    desc: 'Devastating raw power. Though she moves with more weight, her armored strikes shatter bureaucratic resistance.' 
  },
  { 
    id: 'darko', title: 'DARKO', accent: '#44aaff', spd: 95, pwr: 35, gradient: ['#10203a', '#050a15'], label: 'CLASS: SPEEDSTER', file: 'darko_idle.png', 
    desc: 'A tactical blur. Sacrifices raw impact for extreme agility and evasive maneuvers. Death by a thousand cuts.' 
  }
];

// Utility: Canvas Textures for 3D Cards
// Restored "Metal Mania" font for the title texture
function createTitleTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const ctx = c.getContext('2d')!; ctx.textAlign = 'center';
    ctx.font = '900 130px "Metal Mania", Impact, sans-serif';
    ctx.fillStyle = '#ff3333'; ctx.fillText('BORMAGEDDON', 512, 128);
    return new THREE.CanvasTexture(c);
}

// Fixed function for creating immutable textures
function createCardTexture(card: any, img: HTMLImageElement | null = null) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 700;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 700);
    grad.addColorStop(0, card.gradient[0]); grad.addColorStop(1, card.gradient[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 700);
    
    if (img) { 
        ctx.imageSmoothingEnabled = false; 
        ctx.drawImage(img, (512 - img.width * 2.8)/2, (700 - img.height * 2.8)/2 + 20, img.width * 2.8, img.height * 2.8); 
    }
    
    // Restored "Space Mono" font for card details
    ctx.strokeStyle = card.accent; ctx.lineWidth = 20; ctx.strokeRect(10,10,492,680);
    ctx.fillStyle = card.accent; ctx.font = 'bold 24px "Space Mono"'; ctx.fillText(card.label, 50, 75);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 75px "Space Mono"'; ctx.fillText(card.title, 50, 610);
    
    const tex = new THREE.CanvasTexture(c); 
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter; // LinearFilter optimization added for performance
    return tex;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  
  const soundtrackRef = useRef<THREE.Audio | null>(null);
  const activeCardRef = useRef<string | null>(null);
  const targetRotationRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Unified logic for setting active card state and ref
  const handleSetActiveCard = (cardId: string | null) => {
      setActiveCard(cardId);
      activeCardRef.current = cardId;
      if (!cardId) targetRotationRef.current = null;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(THEME.fog, 0.08);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Maintain pixel density across devices
    mountRef.current.appendChild(renderer.domElement);

    const listener = new THREE.AudioListener();
    camera.add(listener);
    soundtrackRef.current = new THREE.Audio(listener);

    // Particles (Falling Ash)
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(1000 * 3);
    for(let i=0; i < 3000; i++) ashPos[i] = (Math.random() - 0.5) * 30;
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    const ashSystem = new THREE.Points(ashGeo, new THREE.PointsMaterial({ size: 0.05, color: THEME.particle, transparent: true, opacity: 0.4 }));
    scene.add(ashSystem);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pointLight = new THREE.PointLight(THEME.point, 20, 30);
    pointLight.position.set(0, 5, 10);
    scene.add(pointLight);

    const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: createTitleTexture(), transparent: true, opacity: 0.5, depthWrite: false }));
    titleMesh.position.set(0, 2, -5);
    scene.add(titleMesh);

    const carouselGroup = new THREE.Group();
    const RADIUS = 4;
    carouselGroup.position.z = -RADIUS;
    scene.add(carouselGroup);

    const cardMeshes: THREE.Mesh[] = [];
    const ANGLE_STEP = (Math.PI * 2) / CARDS_DATA.length;

    CARDS_DATA.forEach((card, i) => {
        const theta = i * ANGLE_STEP;
        // Restored previous complex material logic for correct rendering
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(4, 6, 0.15), 
            [new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshBasicMaterial({transparent: true}), new THREE.MeshStandardMaterial({color: 0x000000})]
        );
        mesh.userData = { index: i, id: card.id };
        mesh.material[4].map = createCardTexture(card);
        
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { 
            const newTex = createCardTexture(card, img);
            mesh.material[4].map?.dispose(); // Proper clean up for old textures
            mesh.material[4].map = newTex;
            mesh.material[4].needsUpdate = true; 
        };
        img.src = RAW_URL + card.file;

        // Position on carousel
        mesh.position.set(Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS);
        // Face the card toward the center
        mesh.rotation.y = theta;
        carouselGroup.add(mesh);
        cardMeshes.push(mesh);
    });

    // Carousel Interaction logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let totalMouseMoveX = 0;
    let prevX = 0;

    const onMouseDown = (e: MouseEvent) => { 
        isDraggingRef.current = true; 
        totalMouseMoveX = 0;
        prevX = e.clientX; 
    };
    const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - prevX;
        totalMouseMoveX += Math.abs(deltaX);
        carouselGroup.rotation.y += deltaX * 0.007;
        prevX = e.clientX;
    };
    const onMouseUp = (e: MouseEvent) => {
        isDraggingRef.current = false;
        // Raycasting for card selection only if mouse movement was minimal
        if (totalMouseMoveX < 5) {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(cardMeshes);
            if (intersects.length > 0) {
                const charId = intersects[0].object.userData.id;
                // Snapping target for smooth rotation
                targetRotationRef.current = -(intersects[0].object.userData.index * ANGLE_STEP);
                handleSetActiveCard(charId);
            }
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

    // Main animation loop
    const animate = () => {
        const frameId = requestAnimationFrame(animate);
        
        // Auto-rotation when not selected or being dragged
        if (!isDraggingRef.current && !activeCardRef.current) {
            carouselGroup.rotation.y += 0.003;
        } else if (activeCardRef.current && targetRotationRef.current !== null) {
            // Smoothly snap to selected card
            carouselGroup.rotation.y += (targetRotationRef.current - carouselGroup.rotation.y) * 0.1;
        }
        
        // Moving particles
        const pos = ashSystem.geometry.attributes.position.array as Float32Array;
        for(let i = 1; i < pos.length; i += 3) { 
            pos[i] += 0.02; 
            if (pos[i] > 10) pos[i] = -10; 
        }
        ashSystem.geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    };
    animate();

    // Clean up function on component unmount
    return () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('resize', handleResize);
        if (soundtrackRef.current?.isPlaying) soundtrackRef.current.stop();
        renderer.dispose();
        if (mountRef.current) mountRef.current.innerHTML = ''; // Proper mounting point clear
    };
  }, []);

  // Handle music initialization on explicit user action
  const handleInitialize = () => {
    setIsInitialized(true);
    new THREE.AudioLoader().load(BGM_URL, (buffer) => {
        soundtrackRef.current!.setBuffer(buffer);
        soundtrackRef.current!.setLoop(true);
        soundtrackRef.current!.play();
        soundtrackRef.current!.setVolume(audioOn ? 0.5 : 0);
    });
  };

  // Sound toggle control function
  const toggleAudio = () => {
      if (soundtrackRef.current) {
          if (audioOn) {
              soundtrackRef.current.setVolume(0);
              setAudioOn(false);
          } else {
              soundtrackRef.current.setVolume(0.5);
              setAudioOn(true);
          }
      } else {
          setAudioOn(!audioOn);
      }
  };

  const currentStats = CARDS_DATA.find(c => c.id === activeCard);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-10 overflow-hidden">
      <div ref={mountRef} className="absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing" />
      
      {!isInitialized ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050404] z-50 pointer-events-auto">
          {/* TERMINAL 01 START-OVERLAY LAYOUT RESTORED */}
          <div className="relative p-12 border-4 border-orange-700/50 bg-black shadow-[0_0_50px_rgba(154,52,18,0.3)] flex flex-col items-center">
            
            <h1 className="text-white text-6xl md:text-8xl font-black italic tracking-tighter mb-2 drop-shadow-[4px_4px_0px_#ff3333] [font-family:Impact,sans-serif]">
              BOR-MAGEDDON
            </h1>
            
            <div className="text-gray-400 font-mono text-xl tracking-[0.4em] mb-12 bg-zinc-900/80 px-4 py-1 border border-zinc-700">
              [TERMINAL_01]
            </div>
            
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-12" />

            <button 
                onClick={handleInitialize} 
                className="group relative bg-[#4a1d0d] border-2 border-orange-900 px-16 py-6 text-white font-mono text-2xl shadow-[0_0_20px_rgba(154,52,18,0.4)] hover:bg-orange-800 hover:scale-105 transition-all active:scale-95 cursor-pointer"
            >
                <span className="relative z-10 tracking-[0.2em] font-bold">INITIALIZE PROTOCOL</span>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <div className="mt-12 text-green-600 font-mono text-xs tracking-widest animate-pulse font-bold">
                ESTABLISHING SECURE CONNECTION...
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none p-10">
          <div className="absolute top-10 right-10 flex gap-3 z-20">
              <button 
                  onClick={toggleAudio}
                  className="pointer-events-auto bg-black/90 border-2 border-orange-800 text-orange-400 font-mono text-xs px-4 py-2 hover:bg-orange-950/20 active:scale-95 transition-all tracking-[0.2em]"
              >
                  AUDIO: [{audioOn ? 'ON' : 'OFF'}]
              </button>
          </div>
          
          <div className="text-red-500 font-mono text-xs tracking-[0.3em] uppercase opacity-80">
            SYSTEM_STATUS: [SCANNING_AGENTS]
          </div>
          
          {/* Expanded Card detail logic restored. Starts closed, opens on click */}
          {activeCard && currentStats && (
            <div className="absolute bottom-12 right-12 w-96 bg-black/95 border-2 border-red-600 p-8 z-30 pointer-events-auto animate-in fade-in slide-in-from-right-10 shadow-[20px_20px_0px_#000]">
               <div className="mb-4 border-b border-red-900/50 pb-4">
                 <div className="text-green-500 text-[10px] mb-1 font-bold tracking-widest">DE-ENCRYPTION SUCCESSFUL</div>
                 <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter [font-family:Impact,sans-serif]">
                  {currentStats.title}
                 </h2>
               </div>
               
               <p className="text-zinc-400 text-xs mb-8 leading-relaxed font-bold h-16 [font-family:'Space Mono',monospace]">
                {currentStats.desc}
               </p>
               
               <div className="space-y-4 mb-8 border border-red-900/30 p-4 bg-red-950/10">
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-zinc-500 font-bold tracking-widest"><span>POWER</span><span>{currentStats.pwr}%</span></div>
                  <div className="h-1 bg-zinc-800"><div className="h-full bg-red-600" style={{ width: `${currentStats.pwr}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-zinc-500 font-bold tracking-widest"><span>SPEED</span><span>{currentStats.spd}%</span></div>
                  <div className="h-1 bg-zinc-800"><div className="h-full bg-cyan-400" style={{ width: `${currentStats.spd}%` }} /></div>
                </div>
               </div>
               
               <button 
                onClick={() => onSelect(activeCard)}
                className="w-full bg-red-600 py-4 font-black text-black text-xl hover:bg-white transition-all uppercase italic shadow-[4px_4px_0px_#440000] cursor-pointer"
               >
                DEPLOY TO BOR
               </button>
               
               <button 
                onClick={() => handleSetActiveCard(null)} 
                className="w-full mt-4 text-zinc-600 text-[10px] hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
               >
                [BACK_TO_SELECTOR]
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};