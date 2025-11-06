'use client';

import { useEffect, useRef, useState } from 'react';
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

export default function Model3DViewer({
  modelUrl,
  className = '',
  autoRotate = true,
  showControls = true,
  cameraPosition = [3, 3, 6],
}: Model3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(...cameraPosition);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 5, -7);
    scene.add(fillLight);

    // Load GLTF/GLB model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf: any) => {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;

        gltf.scene.scale.multiplyScalar(scale);
        gltf.scene.position.sub(center.multiplyScalar(scale));

        // Enable shadows
        gltf.scene.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(gltf.scene);
        setLoading(false);
        setProgress(100);
      },
      (xhr: any) => {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      },
      (error: any) => {
        console.error('Error loading GLTF:', error);
        setError('Failed to load 3D model');
        setLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, autoRotate, cameraPosition]);

  return (
    <div className={`relative ${className}`} ref={mountRef}>
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
        <div className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto text-white/70 text-xs sm:text-sm bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10">
          <span className="hidden sm:inline">🖱️ Drag to rotate • Scroll to zoom • Right-click to pan</span>
          <span className="sm:hidden">👆 Drag to rotate • Pinch to zoom</span>
        </div>
      )}
    </div>
  );
}
