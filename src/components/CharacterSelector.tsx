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

// Optimized function to fix the "Texture is immutable" WebGL crash. 
// Instead of replacing textures, we create one canvas and update it.
function initCardTexture(card: any) {
    const c = document.createElement('canvas');
    c.width = 512; 
    c.height = 700;
    const tex = new THREE.CanvasTexture(c);
    
    // CRITICAL FIX: Stops the WebGL crash
    tex.generateMipmaps = false; 
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    
    // Pre-draw to prevent black textures on load
    drawCardContent(c, card, null);
    tex.needsUpdate = true;
    return tex;
}

function drawCardContent(c: HTMLCanvasElement, card: any, img: HTMLImageElement | null) {
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 700);

    const grad = ctx.createLinearGradient(0, 0, 0, 700);
    grad.addColorStop(0, card.gradient[0]); 
    grad.addColorStop(1, card.gradient[1]);
    ctx.fillStyle = grad; 
    ctx.fillRect(0, 0, 512, 700);
    
    if (img) { 
        ctx.imageSmoothingEnabled = false; 
        ctx.drawImage(img, (512 - img.width * 2.8)/2, (700 - img.height * 2.8)/2 + 20, img.width * 2.8, img.height * 2.8); 
    }
    
    ctx.strokeStyle = card.accent; ctx.lineWidth = 20; ctx.strokeRect(10,10,492,680);
    ctx.fillStyle = card.accent; ctx.font = 'bold 24px "Space Mono", monospace'; ctx.fillText(card.label, 50, 75);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 75px "Space Mono", monospace'; ctx.fillText(card.title, 50, 610);
}

// --- MAIN COMPONENT ---
export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  
  const soundtrackRef = useRef<THREE.Audio | null>(null);
  const activeCardRef = useRef<string | null>(null);
  const targetRotationRef = useRef<number | null>(null);
  
  // Ref for auto-rotate control. Use current to access inside effect.
  const isDraggingRef = useRef<boolean>(false);
  const totalMouseMoveRef = useRef<number>(0);
  const prevXRef = useRef<number>(0);

  // Unified function for setting state and ref
  const handleSetActiveCard = (cardId: string | null) => {
      setActiveCard(cardId);
      activeCardRef.current = cardId;
      if (!cardId) targetRotationRef.current = null;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene setup
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

    // 2. Particles and Lights
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

    const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: createTitleTexture(), transparent: true, opacity: 0.3, depthWrite: false }));
    titleMesh.position.set(0, 2, -6);
    scene.add(titleMesh);

    // 3. Carousel Creation
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

        // Setup Texture
        const texture = initCardTexture(card);
        mesh.material[4].map = texture;
        
        // Load Image and update existing texture
        const img = new Image(); 
        img.crossOrigin = "anonymous";
        img.onload = () => { 
            drawCardContent(texture.image, card, img);
            texture.needsUpdate = true;
        };
        img.src = RAW_URL + card.file;

        mesh.position.set(Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS);
        mesh.rotation.y = theta;
        carouselGroup.add(mesh);
        cardMeshes.push(mesh);
    });

    // 4. Manual Carousel Drag and click logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const container = mountRef.current;
    
    const onMouseDown = (e: MouseEvent) => { 
        isDraggingRef.current = true; 
        totalMouseMoveRef.current = 0;
        prevXRef.current = e.clientX; 
    };
    const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - prevXRef.current;
        totalMouseMoveRef.current += Math.abs(deltaX);
        carouselGroup.rotation.y += deltaX * 0.007;
        prevXRef.current = e.clientX;
    };
    const onMouseUp = (e: MouseEvent) => {
        isDraggingRef.current = false;
        if (totalMouseMoveRef.current < 5) { //Small threshold for a click
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(cardMeshes);
            if (intersects.length > 0) {
                const charId = intersects[0].object.userData.id;
                targetRotationRef.current = -(intersects[0].object.userData.index * ANGLE_STEP);
                handleSetActiveCard(charId);
            }
        }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
        requestAnimationFrame(animate);
        
        // Auto-rotation fix. Decisions based on ref state.
        if (!isDraggingRef.current && activeCardRef.current === null) {
            carouselGroup.rotation.y += 0.003;
        } else if (activeCardRef.current !== null && targetRotationRef.current !== null) {
            carouselGroup.rotation.y += (targetRotationRef.current - carouselGroup.rotation.y) * 0.1;
        }
        
        const pos = ashSystem.geometry.attributes.position.array as Float32Array;
        for(let i = 1; i < pos.length; i += 3) { pos[i] += 0.02; if (pos[i] > 10) pos[i] = -10; }
        ashSystem.geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    };
    animate();

    return () => {
        container.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('resize', handleResize);
        if (soundtrackRef.current?.isPlaying) soundtrackRef.current.stop();
        renderer.dispose();
        if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  const handleInitialize = () => {
    setIsInitialized(true);
    new THREE.AudioLoader().load(BGM_URL, (buffer) => {
        soundtrackRef.current!.setBuffer(buffer);
        soundtrackRef.current!.setLoop(true);
        soundtrackRef.current!.play();
        soundtrackRef.current!.setVolume(audioOn ? 0.5 : 0);
    });
  };

  const toggleAudio = () => {
      if (soundtrackRef.current) {
          if (audioOn) soundtrackRef.current.setVolume(0);
          else soundtrackRef.current.setVolume(0.5);
      }
      setAudioOn(!audioOn);
  };

  const currentStats = CARDS_DATA.find(c => c.id === activeCard);

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
      {/* Required Overlays */}
      <div className="scanlines" style={{ pointerEvents: 'none' }} />
      <div className="crt-overlay" style={{ pointerEvents: 'none' }} />

      {/* 3D Scene Layer */}
      <div 
        ref={mountRef} 
        style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, cursor: activeCard ? 'default' : 'grab' }} 
      />
      
      {/* 1. START OVERLAY LAYOUT RESTORED */}
      {!isInitialized && (
        <div id="start-overlay" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="start-box">
            <h1 className="font-metal">BOR-MAGEDDON</h1>
            <div className="font-mono-title" style={{ marginTop: '10px', letterSpacing: '4px' }}>
              [TERMINAL_01]
            </div>
            <button id="initialize-btn" onClick={handleInitialize} style={{ marginTop: '30px' }}>
              INITIALIZE PROTOCOL
            </button>
            <p style={{ color: '#00ff00', marginTop: '30px', animation: 'pulse 2s infinite', fontSize: '12px', fontFamily: "'Space Mono', monospace" }}>
              ESTABLISHING SECURE CONNECTION...
            </p>
          </div>
        </div>
      )}

      {/* 2. MAIN HEADER UI */}
      {isInitialized && (
        <div id="terminal-header" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, pointerEvents: 'none' }}>
          <div id="hint" style={{ fontFamily: "'Space Mono', monospace" }}>SYSTEM_STATUS: [SCANNING_AGENTS]</div>
          <button id="music-toggle" onClick={toggleAudio} style={{ pointerEvents: 'auto', fontFamily: "'Space Mono', monospace" }}>
            AUDIO: [{audioOn ? 'ON' : 'OFF'}]
          </button>
        </div>
      )}
      
      {/* 3. EXPANDED CHARACTER CARD LAYOUT IMPROVED */}
      {/* Starts closed, opens on click, styled exactly per previous version */}
      {isInitialized && activeCard && currentStats && (
        <div id="expanded-card" className="active" style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', background: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card-content">
            <button className="close-btn" onClick={() => handleSetActiveCard(null)}>X</button>
            
            <div style={{ color: '#00ff00', fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
              DE-ENCRYPTION SUCCESSFUL
            </div>
            
            <h2 className="card-title font-metal">{currentStats.title}</h2>
            <p className="card-desc" style={{ marginBottom: '20px' }}>{currentStats.desc}</p>
            
            {/* Stat Bars in boxed section */}
            <div style={{ border: '1px solid rgba(255,51,51,0.3)', padding: '15px', marginBottom: '20px', background: 'rgba(255,51,51,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span className="stat-label" style={{ fontFamily: "'Space Mono', monospace" }}>POWER</span> <span className="stat-label">{currentStats.pwr}%</span>
              </div>
              <div style={{ height: '4px', background: '#333', marginBottom: '15px' }}>
                <div style={{ height: '100%', width: `${currentStats.pwr}%`, background: '#ff3333' }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span className="stat-label" style={{ fontFamily: "'Space Mono', monospace" }}>SPEED</span> <span className="stat-label">{currentStats.spd}%</span>
              </div>
              <div style={{ height: '4px', background: '#333' }}>
                <div style={{ height: '100%', width: `${currentStats.spd}%`, background: '#00ffff' }} />
              </div>
            </div>
            
            <button className="select-btn" onClick={() => onSelect(activeCard)}>
              DEPLOY TO BOR
            </button>
          </div>
        </div>
      )}

    </div>
  );
};