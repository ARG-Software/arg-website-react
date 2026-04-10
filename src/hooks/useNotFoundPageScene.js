import { useEffect, useRef } from 'react';

export function useNotFoundPageScene(canvasId = 'notfound-canvas') {
  const animationId = useRef(null);
  const cleanupRef = useRef(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    let mounted = true;
    let THREE = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let logoGroup = null;
    let carSystem1 = null;
    let carSystem2 = null;

    const CONFIG = {
      city: {
        gridSize: 75,
        spacing: 1.35,
        buildingColor: 0xffffff,
        roadWidth: 4,
        clipHorizon: 12,
        maxHeight: 18,
      },
      traffic: {
        count: 12,
        speed: 0.18,
        carColor: 0x0c002e,
        laneOffset: 1.2,
      },
      logo: {
        primary: '#ff002b',
        secondary: '#9d00ff',
        floatHeight: 16,
        scale: 2.5,
      },
      perf: {
        fpsLimit: 1 / 30,
        pixelRatioCap: 1.5,
      },
    };

    const init = async () => {
      if (!mounted) return;

      THREE = await import('three');
      const container = canvas.parentElement;
      const width = container.offsetWidth || window.innerWidth;
      const height = container.offsetHeight || window.innerHeight;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);
      scene.fog = new THREE.FogExp2(0xf8f9fa, 0.009);

      camera = new THREE.PerspectiveCamera(35, width / height, 1, 500);
      camera.position.set(0, 30, 100);
      camera.lookAt(0, 8, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.perf.pixelRatioCap));
      renderer.setClearColor(0xf8f9fa);

      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const sun = new THREE.DirectionalLight(0xffffff, 0.6);
      sun.position.set(50, 100, 50);
      scene.add(sun);

      const roadLen = CONFIG.city.gridSize * CONFIG.city.spacing * 2.5;
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(CONFIG.city.roadWidth, roadLen),
        new THREE.MeshStandardMaterial({ color: 0xe5e5e5 })
      );
      road.rotation.x = -Math.PI / 2;
      road.position.y = -9.99;
      scene.add(road);

      const cityMaterial = new THREE.MeshStandardMaterial({
        color: CONFIG.city.buildingColor,
        transparent: true,
        opacity: 0.9,
      });
      const instancedCity = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        cityMaterial,
        Math.pow(CONFIG.city.gridSize * 2, 2)
      );
      const dummy = new THREE.Object3D();
      let count = 0;

      const gridLimit = CONFIG.city.gridSize * CONFIG.city.spacing;
      const visibleLimit = gridLimit - CONFIG.city.clipHorizon;

      for (let x = -CONFIG.city.gridSize; x < CONFIG.city.gridSize; x++) {
        for (let z = -CONFIG.city.gridSize; z < CONFIG.city.gridSize; z++) {
          const px = x * CONFIG.city.spacing;
          const pz = z * CONFIG.city.spacing;

          if (Math.abs(px) < CONFIG.city.roadWidth / 1.6) continue;
          if (Math.abs(pz) > visibleLimit) continue;

          const h = Math.random() * Math.random() * CONFIG.city.maxHeight + 1.5;
          dummy.position.set(px, h / 2 - 10, pz);
          dummy.scale.set(0.6 + Math.random() * 0.4, h, 0.6 + Math.random() * 0.4);
          dummy.updateMatrix();
          instancedCity.setMatrixAt(count++, dummy.matrix);
        }
      }
      scene.add(instancedCity);

      const carMat = new THREE.MeshStandardMaterial({
        color: CONFIG.traffic.carColor,
        emissive: CONFIG.traffic.carColor,
        emissiveIntensity: 0.4,
      });
      const createLane = dir => {
        const mesh = new THREE.InstancedMesh(
          new THREE.BoxGeometry(0.3, 0.2, 0.6),
          carMat,
          CONFIG.traffic.count
        );
        const data = [];
        const spacingZ = (visibleLimit * 2) / CONFIG.traffic.count;
        for (let i = 0; i < CONFIG.traffic.count; i++) {
          data.push({ z: i * spacingZ - visibleLimit });
        }
        return { mesh, data, dir };
      };
      carSystem1 = createLane(1);
      carSystem2 = createLane(-1);
      scene.add(carSystem1.mesh, carSystem2.mesh);

      logoGroup = new THREE.Group();
      const c1 = new THREE.Color(CONFIG.logo.primary);
      const c2 = new THREE.Color(CONFIG.logo.secondary);
      const addPart = (w, h, d, x, y, z, col) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.4,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.5,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          })
        );
        m.position.set(x, y, z);
        logoGroup.add(m);
      };
      addPart(4, 2, 1.2, 1.5, 3.1, 0.01, c1);
      addPart(3, 2, 1.2, -1.0, 1.1, 0.02, c1.clone().lerp(c2, 0.25));
      addPart(1.5, 2.5, 1.2, 0.75, 0.2, 0.03, c1.clone().lerp(c2, 0.5));
      addPart(4.5, 2, 1.2, 2.25, -1.2, 0.04, c1.clone().lerp(c2, 0.75));
      addPart(1.5, 2, 1.2, 3.75, -3.2, 0.05, c2);

      logoGroup.position.set(0, CONFIG.logo.floatHeight, 20);
      logoGroup.scale.set(CONFIG.logo.scale, CONFIG.logo.scale, CONFIG.logo.scale);
      logoGroup.rotation.x = -0.1;
      scene.add(logoGroup);

      const updateTraffic = (sys, lx, limit) => {
        const d = new THREE.Object3D();
        sys.data.forEach((car, i) => {
          car.z += CONFIG.traffic.speed * sys.dir;
          if (car.z > limit) car.z = -limit;
          else if (car.z < -limit) car.z = limit;
          d.position.set(lx, -9.8, car.z);
          d.updateMatrix();
          sys.mesh.setMatrixAt(i, d.matrix);
        });
        sys.mesh.instanceMatrix.needsUpdate = true;
      };

      const handleResize = () => {
        if (!mounted || !container) return;
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);
      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
      };

      const animate = now => {
        if (!mounted) return;
        animationId.current = requestAnimationFrame(animate);
        const delta = (now - lastTimeRef.current) / 1000;
        if (delta < CONFIG.perf.fpsLimit) return;
        lastTimeRef.current = now;

        if (!document.hidden && logoGroup) {
          const limit = CONFIG.city.gridSize * CONFIG.city.spacing - CONFIG.city.clipHorizon;
          updateTraffic(carSystem1, -CONFIG.traffic.laneOffset, limit);
          updateTraffic(carSystem2, CONFIG.traffic.laneOffset, limit);
          logoGroup.position.y = CONFIG.logo.floatHeight + Math.sin(now * 0.0015) * 0.4;
        }
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };

      animate(0);
    };

    init();

    return () => {
      mounted = false;
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [canvasId]);
}
