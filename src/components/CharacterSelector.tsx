import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
}

const THEME = { bg: 0x050404, fog: 0x1a0a05, particle: 0xff3333, ambient: 0xffffff, point: 0xff4422 };
const RAW_URL = 'https://raw.githubusercontent.com/ivanatag/bor-mageddon-protocol-2/main/public/assets/images/characters/';
const BGM_URL = 'https://raw.githubusercontent.com/ivanatag/bor-mageddon-protocol-2/main/public/assets/audio/bgm/bormageddon-character-menu-soundtrack.wav';

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
function createTitleTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const ctx = c.getContext('2d')!; ctx.textAlign = 'center';
    ctx.font = '900 130px "Metal Mania", Impact, sans-serif';
    ctx.fillStyle = '#ff3333'; ctx.fillText('BORMAGEDDON', 512, 128);
    return new THREE.CanvasTexture(c);
}

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
    
    ctx.strokeStyle = card.accent; ctx.lineWidth = 20; ctx.strokeRect(10,10,492,680);
    ctx.fillStyle = card.accent; ctx.font = 'bold 24px "Space Mono"'; ctx.fillText(card.label, 50, 75);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 75px "Space Mono"'; ctx.fillText(card.title, 50, 610);
    
    const tex = new THREE.CanvasTexture(c); 
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter; // Fixes WebGL 'immutable texture' crash
    return tex;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  
  const soundtrackRef = useRef<THREE.Audio | null>(null);
  const activeCardRef = useRef<string | null>(null);
  const targetRotationRef = useRef<number | null>(null);

  const handleSetActiveCard = (cardId: string | null) => {
      setActiveCard(cardId);
      activeCardRef.current = cardId;
      if (!cardId) targetRotationRef.current = null;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(THEME.fog, 0.08);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
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
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(4, 6, 0.15), 
            [new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshStandardMaterial({color: 0x111111}), new THREE.MeshBasicMaterial({transparent: true}), new THREE.MeshStandardMaterial({color: 0x000000})]
        );
        mesh.userData = { index: i, id: card.id };
        mesh.material[4].map = createCardTexture(card);
        
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { 
            const newTex = createCardTexture(card, img);
            mesh.material[4].map?.dispose(); // Cleans old texture memory
            mesh.material[4].map = newTex;
            mesh.material[4].needsUpdate = true; 
        };
        img.src = RAW_URL + card.file;

        mesh.position.set(Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS);
        mesh.rotation.y = theta;
        carouselGroup.add(mesh);
        cardMeshes.push(mesh);
    });

    // Interaction logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let prevX = 0;

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; };
    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        carouselGroup.rotation.y += (e.clientX - prevX) * 0.01;
        prevX = e.clientX;
    };
    const onMouseUp = (e: MouseEvent) => {
        isDragging = false;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cardMeshes);
        if (intersects.length > 0) {
            const charId = intersects[0].object.userData.id;
            targetRotationRef.current = -(intersects[0].object.userData.index * ANGLE_STEP);
            handleSetActiveCard(charId);
        }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const animate = () => {
        requestAnimationFrame(animate);
        if (!isDragging && !activeCardRef.current) {
            carouselGroup.rotation.y += 0.003;
        } else if (activeCardRef.current && targetRotationRef.current !== null) {
            carouselGroup.rotation.y += (targetRotationRef.current - carouselGroup.rotation.y) * 0.1;
        }
        
        const pos = ashSystem.geometry.attributes.position.array as Float32Array;
        for(let i = 1; i < pos.length; i += 3) { 
            pos[i] += 0.02; 
            if (pos[i] > 10) pos[i] = -10; 
        }
        ashSystem.geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    };
    animate();

    return () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        if (soundtrackRef.current?.isPlaying) soundtrackRef.current.stop();
        renderer.dispose();
    };
  }, []);

  const handleInitialize = () => {
    setIsInitialized(true);
    new THREE.AudioLoader().load(BGM_URL, (buffer) => {
        soundtrackRef.current!.setBuffer(buffer);
        soundtrackRef.current!.setLoop(true);
        soundtrackRef.current!.play();
    });
  };

  const currentStats = CARDS_DATA.find(c => c.id === activeCard);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-10">
      <div ref={mountRef} className="absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing" />
      
      {!isInitialized ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050404] z-50 pointer-events-auto">
          {/* TERMINAL 01 AESTHETIC RESTORED */}
          <div className="flex flex-col items-center border-2 border-[#ff3333] p-16 shadow-[0_0_40px_rgba(255,51,51,0.3)] min-w-[600px] bg-black">
            
            <h1 className="text-white text-6xl md:text-8xl font-black italic tracking-tighter mb-2 drop-shadow-[4px_4px_0px_#ff3333] [font-family:Impact,sans-serif]">
              BOR-MAGEDDON
            </h1>
            
            <div className="text-gray-400 font-mono text-2xl tracking-[0.2em] mb-8">
              [TERMINAL_01]
            </div>
            
            <div className="w-full border-t border-zinc-700 mb-10" />

            <button 
                onClick={handleInitialize} 
                className="bg-[#8b4513] border-2 border-[#5c2e0b] px-12 py-5 text-white font-mono font-bold text-2xl tracking-[0.1em] shadow-[4px_4px_0px_#000] hover:bg-[#a0522d] transition-colors mb-12 active:translate-y-1 active:shadow-none cursor-pointer"
            >
                INITIALIZE PROTOCOL
            </button>
            
            {/* Syntax Error Fixed Here (No more mismatched </p>) */}
            <div className="text-[#00ff00] font-mono text-sm tracking-widest animate-pulse font-bold">
                ESTABLISHING SECURE CONNECTION...
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none p-10">
          <div className="text-red-500 font-mono text-xs tracking-[0.3em] uppercase opacity-80">
            SYSTEM_STATUS: [SCANNING_AGENTS]
          </div>
          
          {activeCard && currentStats && (
            <div className="absolute bottom-12 right-12 w-96 bg-black/95 border-2 border-red-600 p-8 z-30 pointer-events-auto animate-in fade-in slide-in-from-right-10 shadow-[20px_20px_0px_#000]">
               <div className="mb-4 border-b border-red-900/50 pb-4">
                 <div className="text-green-500 text-[10px] mb-1 font-bold">DE-ENCRYPTION SUCCESSFUL</div>
                 <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter">
                  {currentStats.title}
                 </h2>
               </div>
               
               <p className="text-zinc-400 text-xs mb-8 leading-relaxed font-bold h-16">
                {currentStats.desc}
               </p>
               
               <div className="space-y-4 mb-8 border border-red-900/30 p-4 bg-red-950/10">
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-zinc-500 font-bold"><span>POWER</span><span>{currentStats.pwr}%</span></div>
                  <div className="h-1 bg-zinc-800"><div className="h-full bg-red-600" style={{ width: `${currentStats.pwr}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 text-zinc-500 font-bold"><span>SPEED</span><span>{currentStats.spd}%</span></div>
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