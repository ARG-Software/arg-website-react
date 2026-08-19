import { useEffect, useRef } from 'react';
import { useRAF } from './useRAF';

export function useThreeSphereBackground(canvasId = 'spheres-canvas') {
  const renderRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    let mounted = true;
    let renderer = null;
    let scene = null;
    let camera = null;
    let sphere1 = null;
    let sphere2 = null;
    let materialLarge = null;
    let materialSmall = null;
    let geo1 = null;
    let geo2 = null;

    const init = async () => {
      if (!mounted) return;

      const THREE = await import('three');
      const container = canvas.parentElement;
      const width = container.offsetWidth || 500;
      const height = container.offsetHeight || 500;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
      camera.position.set(0, 0, 6);
      camera.lookAt(0, 0, 0);
      camera.layers.enableAll();

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      const domeMat = new THREE.MeshBasicMaterial({ color: 0xf0e8f4, side: THREE.BackSide });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(10, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat
      );
      envScene.add(dome);

      const warmMat = new THREE.MeshBasicMaterial({ color: 0xf0d0d0 });
      const warmSphere = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), warmMat);
      warmSphere.position.set(-6, 3, -1);
      envScene.add(warmSphere);

      const coolMat = new THREE.MeshBasicMaterial({ color: 0xd8d0e8 });
      const coolSphere = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), coolMat);
      coolSphere.position.set(6, -1, -2);
      envScene.add(coolSphere);

      const floorMat = new THREE.MeshBasicMaterial({ color: 0xd8d0e0, side: THREE.DoubleSide });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
      floor.position.set(0, -6, 0);
      floor.rotation.x = -Math.PI / 2;
      envScene.add(floor);

      const hemiLight = new THREE.HemisphereLight(0xfff4f8, 0xe0d8e8, 0.9);
      envScene.add(hemiLight);

      const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
      scene.environment = envMap;
      pmremGenerator.dispose();

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xfff8f4, 2.8);
      keyLight.position.set(-3, 5, 3);
      keyLight.layers.set(1);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -3;
      keyLight.shadow.camera.right = 3;
      keyLight.shadow.camera.top = 3;
      keyLight.shadow.camera.bottom = -3;
      keyLight.shadow.bias = -0.002;
      keyLight.shadow.radius = 6;
      scene.add(keyLight);

      const smallLight = new THREE.DirectionalLight(0xf4f0ff, 2.4);
      smallLight.position.set(3, 4, 4);
      smallLight.layers.set(2);
      scene.add(smallLight);

      materialLarge = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.15,
        clearcoat: 0.75,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.85,
        ior: 1.6,
      });

      materialSmall = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.08,
        roughness: 0.12,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        envMapIntensity: 0.95,
        ior: 1.7,
      });

      const GRADIENT_COLORS = [
        new THREE.Color(0xf0060d),
        new THREE.Color(0xc924d7),
        new THREE.Color(0x7904fd),
      ];

      const _cLarge = new THREE.Color();
      const _cSmall = new THREE.Color();
      const _gradientColor = new THREE.Color();
      const _white = new THREE.Color(0xffffff);

      const RADIUS_LARGE = 1;
      const RADIUS_SMALL = 0.72;

      geo1 = new THREE.SphereGeometry(RADIUS_LARGE, 160, 160);
      geo2 = new THREE.SphereGeometry(RADIUS_SMALL, 160, 160);

      sphere1 = new THREE.Mesh(geo1, materialLarge);
      sphere1.castShadow = true;
      sphere1.receiveShadow = true;
      sphere1.layers.enable(1);
      scene.add(sphere1);

      sphere2 = new THREE.Mesh(geo2, materialSmall);
      sphere2.castShadow = true;
      sphere2.receiveShadow = true;
      sphere2.layers.enable(2);
      scene.add(sphere2);

      sphere1.rotation.y = 0.5;
      sphere2.rotation.y = -0.7;

      const ORBIT_COUNT = 2;
      const servicesSection = canvas.closest('.services_wrap') || canvas.closest('.services_grid');

      // Render function called by RAF coordinator
      renderRef.current = delta => {
        if (!mounted || !renderer || !scene || !camera) return;

        let progress = 0;
        if (servicesSection) {
          const rect = servicesSection.getBoundingClientRect();
          const sectionHeight = servicesSection.offsetHeight;
          const viewHeight = window.innerHeight;
          const raw = (viewHeight - rect.top) / (sectionHeight + viewHeight);
          progress = Math.min(Math.max(raw, 0), 1);
        }

        const totalAngle = progress * Math.PI * 2 * ORBIT_COUNT;
        const orbitRadius = 1.15;
        const centerY = 0;
        const x1 = Math.cos(totalAngle + Math.PI) * orbitRadius + 0.2;
        const z1 = Math.sin(totalAngle + Math.PI) * 0.38;
        const x2 = Math.cos(totalAngle) * orbitRadius - 0.2;
        const z2 = Math.sin(totalAngle) * 0.48;

        const colorPhase = progress * 3;
        const colorIndex = Math.floor(colorPhase) % 3;
        const colorBlend = colorPhase - Math.floor(colorPhase);
        const nextColorIndex = (colorIndex + 1) % 3;
        _gradientColor
          .copy(GRADIENT_COLORS[colorIndex])
          .lerp(GRADIENT_COLORS[nextColorIndex], colorBlend);

        const tintStrength = 0.65;
        _cLarge.copy(_gradientColor).lerp(_white, 1 - tintStrength);
        _cSmall.copy(_gradientColor).lerp(_white, 1 - tintStrength * 0.9);

        materialLarge.color.copy(_cLarge);
        materialSmall.color.copy(_cSmall);

        sphere1.position.set(x1, centerY, z1);
        sphere2.position.set(x2, centerY, z2);

        const dtFactor = delta / 0.016;
        sphere1.rotation.y += 0.0022 * dtFactor;
        sphere2.rotation.y -= 0.0017 * dtFactor;

        renderer.render(scene, camera);
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
        if (geo1) geo1.dispose();
        if (geo2) geo2.dispose();
        if (materialLarge) materialLarge.dispose();
        if (materialSmall) materialSmall.dispose();
        if (renderer) renderer.dispose();
      };
    };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            init();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '400px' }
    );

    observer.observe(canvas);

    return () => {
      mounted = false;
      observer.disconnect();
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [canvasId]);

  useRAF((delta, elapsed, transitioning) => {
    if (renderRef.current) renderRef.current(delta, elapsed, transitioning);
  }, []);
}
