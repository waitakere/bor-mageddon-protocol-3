import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ... Keep your CARDS_DATA and THEME constants as they were ...

/**
 * FIXED TEXTURE GENERATOR
 * We use a single function to return a texture that we will manually update.
 */
function createCardTexture(card: any, img: HTMLImageElement | null = null) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 700;
    const ctx = c.getContext('2d')!;
    
    // Draw Background
    const grad = ctx.createLinearGradient(0, 0, 0, 700);
    grad.addColorStop(0, card.gradient[0]);
    grad.addColorStop(1, card.gradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 700);
    
    // Draw Character Image
    if (img) { 
        ctx.imageSmoothingEnabled = false; 
        ctx.drawImage(img, (512 - img.width * 2.8)/2, (700 - img.height * 2.8)/2 + 20, img.width * 2.8, img.height * 2.8); 
    }
    
    // Draw UI Elements
    ctx.strokeStyle = card.accent; 
    ctx.lineWidth = 20; 
    ctx.strokeRect(10,10,492,680);
    ctx.fillStyle = card.accent; 
    ctx.font = 'bold 24px monospace'; 
    ctx.fillText(card.label, 50, 75);
    ctx.fillStyle = '#fff'; 
    ctx.font = 'bold 75px monospace'; 
    ctx.fillText(card.title, 50, 610);
    
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    // CRITICAL: Prevent the immutable texture error by setting minFilter
    tex.minFilter = THREE.LinearFilter; 
    return tex;
}

export const CharacterSelector: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [activeCard, setActiveCard] = useState<string | null>(null);
    
    // Use refs for Three.js objects to avoid React re-render conflicts
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.FogExp2(0x1a0a05, 0.08);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 12);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const carouselGroup = new THREE.Group();
        scene.add(carouselGroup);

        const RADIUS = 4;
        carouselGroup.position.z = -RADIUS;

        CARDS_DATA.forEach((card, i) => {
            const theta = (i / CARDS_DATA.length) * Math.PI * 2;
            const material = new THREE.MeshBasicMaterial({ transparent: true });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.1), material);
            
            // Initial render without image
            material.map = createCardTexture(card);
            
            // Load image and UPDATE existing texture instead of re-creating
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const newTex = createCardTexture(card, img);
                mesh.material.map?.dispose(); // Clean up old texture memory
                mesh.material.map = newTex;
                mesh.material.needsUpdate = true;
            };
            img.src = RAW_URL + card.file;

            mesh.position.set(Math.sin(theta) * RADIUS, 0, Math.cos(theta) * RADIUS);
            mesh.rotation.y = theta;
            mesh.userData = { id: card.id, index: i };
            carouselGroup.add(mesh);
        });

        // Simple Animation Loop
        let frameId: number;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            if (!activeCard) carouselGroup.rotation.y += 0.005;
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(frameId);
            renderer.dispose();
            if (mountRef.current) mountRef.current.innerHTML = '';
        };
    }, [activeCard]);

    return (
        <div className="absolute inset-0 w-full h-full">
            <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
            
            {/* UI LAYER */}
            {!isInitialized ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 pointer-events-auto">
                    <button 
                        onClick={() => setIsInitialized(true)}
                        className="bg-red-600 px-12 py-6 text-white font-black text-2xl border-4 border-red-900 shadow-[8px_8px_0px_#000] hover:bg-white hover:text-red-600 transition-all uppercase italic"
                    >
                        Initialize Protocol
                    </button>
                </div>
            ) : (
                <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between">
                    <div className="text-red-500 font-mono text-sm animate-pulse tracking-[0.3em]">
                        SYSTEM_STATUS: [ONLINE] // PROTOCOL_V3
                    </div>
                    
                    {/* Character Card Info (shows if a card is selected/clicked) */}
                    {activeCard && (
                        <div className="self-end bg-black/90 border-2 border-red-600 p-8 w-96 pointer-events-auto">
                            <h2 className="text-4xl font-black italic text-white mb-4">{activeCard.toUpperCase()}</h2>
                            <button 
                                onClick={() => onSelect(activeCard)}
                                className="w-full bg-red-600 py-4 font-bold text-black hover:bg-white transition-all uppercase"
                            >
                                Deploy Agent
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};