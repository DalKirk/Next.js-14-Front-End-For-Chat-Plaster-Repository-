'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Model3DViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  cameraPosition?: [number, number, number];
}

const DEFAULT_CAMERA: [number, number, number] = [3, 3, 6];

export default function Model3DViewer({
  modelUrl,
  className = '',
  autoRotate = true,
  showControls = true,
  cameraPosition,
}: Model3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const camPos = useMemo(() => cameraPosition || DEFAULT_CAMERA, [
    cameraPosition?.[0], cameraPosition?.[1], cameraPosition?.[2]
  ]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(camPos[0], camPos[1], camPos[2]);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Controls — attach to the canvas element directly
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.screenSpacePanning = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // Prevent default on pointer/wheel events so the browser doesn't steal them
    const preventScroll = (e: Event) => { e.preventDefault(); };
    renderer.domElement.addEventListener('wheel', preventScroll, { passive: false });
    renderer.domElement.addEventListener('touchmove', preventScroll, { passive: false });
    renderer.domElement.addEventListener('contextmenu', preventScroll);

    // Cursor feedback
    const onPointerDown = () => { renderer.domElement.style.cursor = 'grabbing'; };
    const onPointerUp = () => { renderer.domElement.style.cursor = 'grab'; };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Lighting — Studio-style bright lighting from all angles
    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 2.0);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 3.5);
    backLight.position.set(0, 5, -8);
    scene.add(backLight);
    const backLight2 = new THREE.DirectionalLight(0xffffff, 2.5);
    backLight2.position.set(5, 3, -5);
    scene.add(backLight2);
    const backLight3 = new THREE.DirectionalLight(0xffffff, 2.5);
    backLight3.position.set(-5, 3, -5);
    scene.add(backLight3);
    const bottomLight = new THREE.DirectionalLight(0xffffff, 1.5);
    bottomLight.position.set(0, -10, 0);
    scene.add(bottomLight);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5));

    // Load GLTF/GLB model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf: any) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        gltf.scene.scale.multiplyScalar(scale);
        gltf.scene.position.sub(center.multiplyScalar(scale));

        gltf.scene.traverse((child: any) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.emissive = new THREE.Color(0x111111);
            child.material.emissiveIntensity = 0.3;
          }
        });

        scene.add(gltf.scene);
        setLoading(false);
        setProgress(100);
      },
      (xhr: any) => {
        if (xhr.lengthComputable) {
          setProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err: any) => {
        console.error('Error loading GLTF:', err);
        setError('Failed to load 3D model');
        setLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('wheel', preventScroll);
      renderer.domElement.removeEventListener('touchmove', preventScroll);
      renderer.domElement.removeEventListener('contextmenu', preventScroll);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      rendererRef.current = null;
      controlsRef.current = null;
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, autoRotate, camPos]);

  return (
    <div className={`relative ${className}`} ref={mountRef} style={{ touchAction: 'none', overflow: 'hidden' }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10 px-4">
          <div className="text-white text-base sm:text-lg mb-4">Loading 3D model...</div>
          <div className="w-48 sm:w-64 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[oklch(0.85_0.2_160)] to-[oklch(0.75_0.25_180)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-white/70 text-xs sm:text-sm mt-2">{progress}%</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10 px-4">
          <div className="text-red-400 text-center p-4 sm:p-8 bg-red-900/20 rounded-lg border border-red-500/30 max-w-md">
            <p className="text-base sm:text-lg font-semibold mb-2">Error</p>
            <p className="text-xs sm:text-sm">{error}</p>
          </div>
        </div>
      )}

      {showControls && !loading && !error && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto text-white/70 text-xs sm:text-sm bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10 pointer-events-none z-20">
          <span className="hidden sm:inline">Click + drag to rotate · Scroll to zoom · Two-finger drag to pan</span>
          <span className="sm:hidden">Drag to rotate · Pinch to zoom</span>
        </div>
      )}
    </div>
  );
}
