import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CharacterSelectorProps {
  onSelect: (characterName: string) => void;
}

// RESTORED CONSTANTS
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

// Texture Helpers
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
    ctx.fillStyle = card.accent; ctx.font = 'bold 24px monospace'; ctx.fillText(card.label, 50, 75);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 75px monospace'; ctx.fillText(card.title, 50, 610);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter; // Fix for "Texture is immutable"
    return tex;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  
  const carouselGroupRef = useRef<THREE.Group | null>(null);
  const activeCardRef = useRef<string | null>(null);
  const targetRotationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(THEME.fog, 0.08);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const carouselGroup = new THREE.Group();
    carouselGroupRef.current = carouselGroup;
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
            mesh.material[4].map?.dispose();
            mesh.material[4].map = newTex;
            mesh.material[4].needsUpdate = true;
        };
        img.src = RAW_URL + card.file;

        mesh.position.set(Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS);
        mesh.rotation.y = theta;
        carouselGroup.add(mesh);
        cardMeshes.push(mesh);
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pointLight = new THREE.PointLight(THEME.point, 20, 30);
    pointLight.position.set(0, 5, 10);
    scene.add(pointLight);

    const animate = () => {
        const frameId = requestAnimationFrame(animate);
        if (carouselGroupRef.current && !activeCardRef.current) {
            carouselGroupRef.current.rotation.y += 0.003;
        } else if (carouselGroupRef.current && targetRotationRef.current !== null) {
            carouselGroupRef.current.rotation.y += (targetRotationRef.current - carouselGroupRef.current.rotation.y) * 0.1;
        }
        renderer.render(scene, camera);
    };
    animate();

    const onMouseUp = (e: MouseEvent) => {
        const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cardMeshes);
        if (intersects.length > 0) {
            const charId = intersects[0].object.userData.id;
            targetRotationRef.current = -(intersects[0].object.userData.index * ANGLE_STEP);
            setActiveCard(charId);
            activeCardRef.current = charId;
        }
    };
    window.addEventListener('mouseup', onMouseUp);

    return () => {
        window.removeEventListener('mouseup', onMouseUp);
        renderer.dispose();
        if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
      <div ref={mountRef} className="absolute inset-0 pointer-events-auto" />
      
      {!isInitialized ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 pointer-events-auto">
          <h1 className="text-red-600 text-7xl md:text-9xl font-black italic tracking-tighter mb-12 drop-shadow-[8px_8px_0px_#440000]">
            BOR-MAGEDDON
          </h1>
          <button 
            onClick={() => setIsInitialized(true)} 
            className="bg-red-600 px-16 py-8 text-white font-black text-2xl shadow-[10px_10px_0px_#440000] hover:bg-white hover:text-red-600 transition-all uppercase italic active:translate-y-2 active:shadow-none"
          >
            Initialize Protocol
          </button>
          <div className="mt-12 text-red-900 font-mono text-sm tracking-[0.5em] animate-pulse">
            ESTABLISHING CONNECTION to TERMINAL_01...
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none p-10">
          <div className="text-red-500 font-mono text-xs tracking-widest">SYSTEM_STATUS: [SCANNING_AGENTS]</div>
          
          {activeCard && currentStats(activeCard) && (
            <div className="absolute bottom-12 right-12 w-96 bg-black/90 border-2 border-red-600 p-8 z-30 pointer-events-auto animate-in fade-in slide-in-from-right-5 shadow-[15px_15px_0px_#000]">
               <h2 className="text-5xl font-black italic text-white mb-2 uppercase tracking-tighter">
                {currentStats(activeCard)?.title}
               </h2>
               <p className="text-zinc-400 text-xs mb-6 leading-relaxed uppercase">
                {currentStats(activeCard)?.desc}
               </p>
               <button 
                onClick={() => onSelect(activeCard)}
                className="w-full bg-red-600 py-4 font-black text-black text-xl hover:bg-white transition-all uppercase italic shadow-[4px_4px_0px_#440000]"
               >
                Deploy to Bor
               </button>
               <button 
                onClick={() => {setActiveCard(null); activeCardRef.current = null;}} 
                className="w-full mt-4 text-zinc-600 text-[10px] hover:text-red-500 uppercase tracking-widest"
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

// Helper to find stats
const currentStats = (id: string) => CARDS_DATA.find(c => c.id === id);