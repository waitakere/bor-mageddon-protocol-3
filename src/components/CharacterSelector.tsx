import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
}

const THEME = { bg: 0x050404, fog: 0x220f05, particle: 0xff3333, ambient: 0xffffff, point: 0xff5533 };
const RAW_URL = 'https://raw.githubusercontent.com/ivanatag/bor-mageddon-protocol-2/main/public/assets/images/characters/';
const BGM_URL = 'https://raw.githubusercontent.com/ivanatag/bor-mageddon-protocol-2/main/public/assets/audio/bgm/bormageddon-character-menu-soundtrack.wav';

const CARDS_DATA = [
  { 
    id: 'marko', title: 'MARKO', accent: '#ff3333', spd: 55, pwr: 90, gradient: ['#3a1010', '#150505'], label: 'AGE: 16', file: 'marko_idle.png', 
    desc: 'Local basketball prodigy turned wasteland brawler. Fueled by heavy metal and a love for non-stop action.' 
  },
  { 
    id: 'maja', title: 'MAJA', accent: '#44ff44', spd: 95, pwr: 65, gradient: ['#103a15', '#051505'], label: 'AGE: 15', file: 'maja_idle.png', 
    desc: 'Do not let the bubbly personality fool you. Her high agility makes her a lethal blur on the battlefield.' 
  },
  { 
    id: 'darko', title: 'DARKO', accent: '#44aaff', spd: 70, pwr: 75, gradient: ['#10203a', '#050a15'], label: 'AGE: 16', file: 'darko_idle.png', 
    desc: 'A certified tactical supergenius. Delivers high melee damage with a baseball bat.' 
  }
];

// Helper functions for 3D Textures
function createTitleTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const ctx = c.getContext('2d')!; ctx.textAlign = 'center';
    ctx.font = '900 130px "Metal Mania", Impact, sans-serif';
    ctx.fillStyle = '#110400'; ctx.fillText('BORMAGEDDON', 522, 138);
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
    // Ensure colors are punchy
    tex.colorSpace = THREE.SRGBColorSpace; 
    return tex;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  
  const soundtrackRef = useRef<THREE.Audio | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- 1. SETUP ---
    const scene = new THREE.Scene();
    scene.background = null; 
    scene.fog = new THREE.FogExp2(THEME.fog, 0.08);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const listener = new THREE.AudioListener();
    camera.add(listener);
    soundtrackRef.current = new THREE.Audio(listener);

    // --- 2. PARTICLES & LIGHTING ---
    const ashCount = 1000;
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    for(let i=0; i < ashCount * 3; i++) {
        ashPos[i] = (Math.random() - 0.5) * 30;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    const ashMaterial = new THREE.PointsMaterial({ size: 0.08, color: THEME.particle, transparent: true, opacity: 0.4 });
    const ashSystem = new THREE.Points(ashGeo, ashMaterial);
    scene.add(ashSystem);

    scene.add(new THREE.AmbientLight(THEME.ambient, 0.4)); // Clean white ambient
    const spotLight = new THREE.PointLight(THEME.point, 10, 25); // Brighter point light
    spotLight.position.set(0, 5, 8);
    scene.add(spotLight);

    // --- 3. MESHES & TEXTURES ---
    const titleMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(26, 7), 
        // Switched to Basic Material + higher opacity so it's always visible!
        new THREE.MeshBasicMaterial({ map: createTitleTexture(), transparent: true, opacity: 0.6, fog: false, depthWrite: false })
    );
    titleMesh.position.set(0, 0, -6); 
    scene.add(titleMesh);

    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);

    const cardMeshes: THREE.Mesh[] = [];
    const RADIUS = 3.8; 
    
    // Push the whole group back so the front card sits exactly at Z=0 (Fixes rotation axis)
    carouselGroup.position.z = -RADIUS;
    
    const ANGLE_STEP = (Math.PI * 2) / CARDS_DATA.length;

    CARDS_DATA.forEach((card, i) => {
        const theta = i * ANGLE_STEP;
        
        const materials = [
            new THREE.MeshStandardMaterial({color: 0x1a0a05}), // Right
            new THREE.MeshStandardMaterial({color: 0x1a0a05}), // Left
            new THREE.MeshStandardMaterial({color: 0x1a0a05}), // Top
            new THREE.MeshStandardMaterial({color: 0x1a0a05}), // Bottom
            // BASIC MATERIAL for the front face guarantees 100% vibrant colors ignoring shadows!
            new THREE.MeshBasicMaterial({transparent: true}), 
            new THREE.MeshStandardMaterial({color: 0x000000})  // Back
        ];
        
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.2), materials);
        mesh.userData = { index: i, characterName: card.id }; 
        
        mesh.material[4].map = createCardTexture(card);
        
        const img = new Image(); 
        img.crossOrigin = "anonymous";
        img.onload = () => { 
            mesh.material[4].map = createCardTexture(card, img); 
            mesh.material[4].needsUpdate = true; 
        };
        img.src = RAW_URL + card.file;

        // Math fix: Removes the `- RADIUS` offset so they rotate around the center perfectly
        mesh.position.x = Math.sin(theta) * RADIUS; 
        mesh.position.z = Math.cos(theta) * RADIUS; 
        mesh.rotation.y = theta;

        carouselGroup.add(mesh);
        cardMeshes.push(mesh);
    });

    // --- 4. INTERACTION ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let totalMove = 0;

    const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        totalMove = 0;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMousePosition.x;
        totalMove += Math.abs(deltaX);
        carouselGroup.rotation.y += deltaX * 0.01;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
        isDragging = false;
        if (totalMove < 8) { 
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(cardMeshes);
            
            if (intersects.length > 0) {
                const clickedChar = intersects[0].object.userData.characterName;
                setActiveCard(clickedChar);
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

    // --- 5. ANIMATION LOOP ---
    let animationFrameId: number;
    let time = 0;

    const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        time++;
        
        if (!isDragging && !activeCard) {
            carouselGroup.rotation.y += 0.002;
        }
        
        carouselGroup.position.y = Math.sin(time * 0.02) * 0.1;

        const pos = ashSystem.geometry.attributes.position.array as Float32Array;
        for(let i = 1; i < pos.length; i += 3) {
            pos[i] += 0.015;
            if (pos[i] > 10) pos[i] = -10;
        }
        ashSystem.geometry.attributes.position.needsUpdate = true;
        
        titleMesh.material.opacity = 0.4 + Math.abs(Math.sin(time * 0.02)) * 0.2;

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

  // --- AUDIO LOGIC ---
  const handleInitialize = () => {
    setIsInitialized(true);
    
    if (soundtrackRef.current) {
        const audioCtx = THREE.AudioContext.getContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(BGM_URL, (buffer) => {
            soundtrackRef.current!.setBuffer(buffer);
            soundtrackRef.current!.setLoop(true);
            soundtrackRef.current!.setVolume(0.5);
            soundtrackRef.current!.play();
        });
    }
  };

  const toggleAudio = () => {
    if (soundtrackRef.current) {
        if (soundtrackRef.current.isPlaying) {
            soundtrackRef.current.pause();
            setAudioOn(false);
        } else {
            soundtrackRef.current.play();
            setAudioOn(true);
        }
    }
  };

  const handleDeployment = () => {
    if (activeCard) onSelect(activeCard);
  };

  const currentStats = activeCard ? CARDS_DATA.find(c => c.id === activeCard) : null;

  return (
    <div className="absolute inset-0 w-full h-full text-white font-mono pointer-events-none select-none z-10">
      
      <div ref={mountRef} className="absolute inset-0 w-full h-full -z-10 pointer-events-auto cursor-grab active:cursor-grabbing" />

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

      {isInitialized && (
        <div id="terminal-header" className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-black/80 border-b border-red-900/50 pointer-events-auto backdrop-blur-sm z-20">
          <div id="hint" className="text-sm font-bold text-red-500 animate-pulse tracking-widest">
            SYSTEM_STATUS: [DRAG_TO_ROTATE] // [CLICK_CARD_FOR_ARCHIVE]
          </div>
          <div id="audio-controls">
            <button 
              onClick={toggleAudio}
              className="text-xs font-bold border border-red-900 px-4 py-2 bg-black hover:bg-red-600 hover:text-white transition-colors cursor-pointer tracking-widest"
            >
              AUDIO: [{audioOn ? 'ON' : 'OFF'}]
            </button>
          </div>
        </div>
      )}

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
            <h2 className="font-metal text-5xl text-white drop-shadow-[3px_3px_0px_#ff3333] tracking-wider uppercase">{currentStats.title}</h2>
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