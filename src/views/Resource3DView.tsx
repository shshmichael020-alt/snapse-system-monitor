import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ProcessSummary } from '../types';

interface Resource3DViewProps {
  processes: ProcessSummary[];
}

export const Resource3DView: React.FC<Resource3DViewProps> = ({ processes }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<'cpu' | 'memory'>('cpu');
  const [selectedProcessInfo, setSelectedProcessInfo] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 480;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d131f);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x47d6ff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // 3. Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x00d2ff, 0x1a202c);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 4. Bar Geometries for top 20 processes
    const topProcesses = processes.slice(0, 20);
    const barsGroup = new THREE.Group();

    const barGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
    // Align base of geometry to 0
    barGeo.translate(0, 0.5, 0);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const barMeshes: THREE.Mesh[] = [];

    const cols = 5;
    topProcesses.forEach((p, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = (col - (cols - 1) / 2) * 2.8;
      const z = (row - 1.5) * 2.8;

      // Scale height by CPU or Memory
      let val = metric === 'cpu' ? p.cpu_usage : p.memory_percent;
      let heightVal = Math.max(val * 0.15, 0.2);

      // Color coding: cyan for low, violet for mid, crimson for high
      let colorHex = 0x00d2ff;
      if (val > 25) colorHex = 0xef4444;
      else if (val > 10) colorHex = 0xf59e0b;
      else if (metric === 'memory') colorHex = 0xdab1ff;

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.6,
      });

      const mesh = new THREE.Mesh(barGeo, mat);
      mesh.position.set(x, 0, z);
      mesh.scale.set(1, heightVal, 1);
      mesh.userData = {
        name: p.name,
        pid: p.pid,
        value: val.toFixed(1) + (metric === 'cpu' ? '%' : '% RAM'),
      };

      barsGroup.add(mesh);
      barMeshes.push(mesh);
    });

    scene.add(barsGroup);

    // Simple mouse drag rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      // Raycasting for hover tooltip
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(barMeshes);
      if (intersects.length > 0) {
        const u = intersects[0].object.userData;
        setSelectedProcessInfo(`${u.name} (PID: ${u.pid}) • ${u.value}`);
      }

      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      barsGroup.rotation.y += deltaX * 0.008;
      camera.position.y = Math.max(Math.min(camera.position.y - deltaY * 0.05, 30), 5);
      camera.lookAt(0, 0, 0);

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      // Gentle subtle idle oscillation
      barsGroup.rotation.y += 0.001;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      barGeo.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [processes, metric]);

  return (
    <div className="flex flex-col w-full text-on-surface select-none gap-space-sm">
      {/* Top Controls */}
      <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40 shadow-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">view_in_ar</span>
          <div className="flex flex-col">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Snapse 3D Resource Landscape
            </h1>
            <span className="font-code-telemetry text-body-sm text-on-surface-variant">
              Spatial process telemetry visualization (Click &amp; drag to rotate)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="flex items-center bg-surface-container-high rounded p-0.5 font-label-md text-label-md">
            <button
              onClick={() => setMetric('cpu')}
              className={`px-space-md py-1 rounded transition-all ${
                metric === 'cpu'
                  ? 'bg-primary-container text-on-primary-container font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              CPU Load
            </button>
            <button
              onClick={() => setMetric('memory')}
              className={`px-space-md py-1 rounded transition-all ${
                metric === 'memory'
                  ? 'bg-tertiary-container text-on-tertiary-container font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              RAM Footprint
            </button>
          </div>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="relative w-full h-[520px] bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-container-high/60 shadow-inner">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing"></div>

        {/* Hover telemetry badge */}
        {selectedProcessInfo && (
          <div className="absolute top-4 left-4 bg-surface-container-high/90 backdrop-blur-md px-space-md py-space-xs rounded-lg border border-primary/50 text-primary font-code-telemetry text-body-sm shadow-xl">
            {selectedProcessInfo}
          </div>
        )}

        <div className="absolute bottom-4 right-4 bg-surface-container-lowest/80 backdrop-blur-sm px-space-sm py-1 rounded text-[11px] font-code-telemetry text-outline border border-surface-container-high/40">
          Showing Top 20 Processes • Three.js WebGL Core
        </div>
      </div>
    </div>
  );
};
