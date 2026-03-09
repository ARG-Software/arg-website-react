import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
// import 'lenis/dist/lenis.css';
import { ARTICLES } from './articlesData.js';
import TransitionLink from "./TransitionLink";

export default function App() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Add Webflow class
    const docEl = document.documentElement;
    docEl.className += ' w-mod-js';
    if ('ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch)) {
      docEl.className += ' w-mod-touch';
    }

    // ── Helper: defer non-critical work ──
    const deferInit = (fn) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(fn);
      } else {
        setTimeout(fn, 50);
      }
    };

    // ── Spline (uses npm import now) ──
const initSpheres = async () => {
  const canvas = document.getElementById('spheres-canvas');
  if (!canvas) return;
  const THREE = await import('three');
  const container = canvas.parentElement;
  const width = container.offsetWidth || 500;
  const height = container.offsetHeight || 500;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);
  camera.layers.enableAll();

  const renderer = new THREE.WebGLRenderer({
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  const domeMat = new THREE.MeshBasicMaterial({ color: 0xf0e8f4, side: THREE.BackSide });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
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

  const envMap = pmremGenerator.fromScene(envScene, 0.1).texture;
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

  const materialLarge = new THREE.MeshPhysicalMaterial({
    color: 0xf0e4e8,
    metalness: 0.05,
    roughness: 0.2,
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.75,
    ior: 1.8,
    morphTargets: true,
  });

  const materialSmall = new THREE.MeshPhysicalMaterial({
    color: 0xe8e0f0,
    metalness: 0.04,
    roughness: 0.16,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.85,
    ior: 1.9,
    morphTargets: true,
  });

  const wireLargeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0,
    morphTargets: true,
    depthTest: true,
  });

  const wireSmallMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0,
    morphTargets: true,
    depthTest: true,
  });

  // Base colors to blend continuously
  const COLORS_LARGE = [
    new THREE.Color(0x6c30c8),
    new THREE.Color(0x8838b0),
    new THREE.Color(0xd94060),
    new THREE.Color(0x4080ff), // stair
  ];
  const COLORS_SMALL = [
    new THREE.Color(0x7c3cd8),
    new THREE.Color(0x9640c0),
    new THREE.Color(0xe04868),
    new THREE.Color(0x60a0ff),
  ];
  const WIRE_COLORS = [
    new THREE.Color(0xc4a0ff),
    new THREE.Color(0xd0b0f0),
    new THREE.Color(0xffa0b0),
    new THREE.Color(0x80c0ff),
  ];

  const _cLarge = new THREE.Color();
  const _cSmall = new THREE.Color();
  const _cWire  = new THREE.Color();

  // --- Morph builders ---
  function buildCubeMorph(geometry, radius) {
    const pos = geometry.getAttribute('position');
    const morphPos = new Float32Array(pos.count * 3);
    const axis = new THREE.Vector3(1, 0, 1).normalize();
    const rotMat = new THREE.Matrix4().makeRotationAxis(axis, Math.PI / 4);
    const v = new THREE.Vector3();
    const scale = 0.78;

    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const len = v.length();
      if (len > 1e-6) {
        v.normalize();
        const maxAbs = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
        v.multiplyScalar((radius * scale) / maxAbs);
      }
      v.applyMatrix4(rotMat);
      morphPos[i * 3]     = v.x;
      morphPos[i * 3 + 1] = v.y;
      morphPos[i * 3 + 2] = v.z;
    }
    return new THREE.BufferAttribute(morphPos, 3);
  }

  function buildOctahedronMorph(geometry, radius) {
    const pos = geometry.getAttribute('position');
    const morphPos = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const scale = 1.1;

    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const len = v.length();
      if (len > 1e-6) {
        v.normalize();
        const l1 = Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z);
        v.multiplyScalar((radius * scale) / l1);
      }
      morphPos[i * 3]     = v.x;
      morphPos[i * 3 + 1] = v.y;
      morphPos[i * 3 + 2] = v.z;
    }
    return new THREE.BufferAttribute(morphPos, 3);
  }

  function buildCrossMorph(geometry, radius) {
    const pos = geometry.getAttribute('position');
    const morphPos = new Float32Array(pos.count * 3);
    const axis = new THREE.Vector3(1, 0, 1).normalize();
    const rotMat = new THREE.Matrix4().makeRotationAxis(axis, Math.PI / 4);
    const v = new THREE.Vector3();

    const h = radius * 0.82;
    const t = radius * 0.30;
    const gap = radius * 0.02;
    const bevel = 0.06;

    function smax(a, b, k) {
      const ea = Math.exp(a / k);
      const eb = Math.exp(b / k);
      return k * Math.log(ea + eb);
    }
    function smax3(a, b, c, k) {
      return smax(smax(a, b, k), c, k);
    }

    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const len = v.length();
      if (len > 1e-6) {
        v.normalize();
        const ax = Math.abs(v.x) || 1e-6;
        const ay = Math.abs(v.y) || 1e-6;
        const az = Math.abs(v.z) || 1e-6;

        const tg = t - gap;
        const dSlabX = Math.min(tg / ax, h / ay, h / az);
        const dSlabY = Math.min(h / ax, tg / ay, h / az);
        const dSlabZ = Math.min(h / ax, h / ay, tg / az);

        const d = smax3(dSlabX, dSlabY, dSlabZ, bevel);
        v.multiplyScalar(d);
      }
      v.applyMatrix4(rotMat);
      morphPos[i * 3]     = v.x;
      morphPos[i * 3 + 1] = v.y;
      morphPos[i * 3 + 2] = v.z;
    }
    return new THREE.BufferAttribute(morphPos, 3);
  }

  function buildStairMorph(geometry, radius) {
    const pos = geometry.getAttribute('position');
    const morphPos = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const steps = 5;

    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const len = v.length();
      if (len > 1e-6) {
        v.normalize();
        const y = v.y * radius;
        const stepIndex = Math.floor(((y + radius) / (2 * radius)) * steps);
        const stepHeight = -radius + (stepIndex / (steps - 1)) * 2 * radius;
        v.y = stepHeight;
        v.x *= radius;
        v.z *= radius;
      }
      morphPos[i * 3] = v.x;
      morphPos[i * 3 + 1] = v.y;
      morphPos[i * 3 + 2] = v.z;
    }
    return new THREE.BufferAttribute(morphPos, 3);
  }

  const RADIUS_LARGE = 1;
  const RADIUS_SMALL = 0.72;

  const geo1 = new THREE.SphereGeometry(RADIUS_LARGE, 160, 160);
  const geo2 = new THREE.SphereGeometry(RADIUS_SMALL, 160, 160);

  geo1.morphAttributes.position = [
    buildCubeMorph(geo1, RADIUS_LARGE),
    buildOctahedronMorph(geo1, RADIUS_LARGE),
    buildCrossMorph(geo1, RADIUS_LARGE),
    buildStairMorph(geo1, RADIUS_LARGE),
  ];
  geo2.morphAttributes.position = [
    buildCubeMorph(geo2, RADIUS_SMALL),
    buildOctahedronMorph(geo2, RADIUS_SMALL),
    buildCrossMorph(geo2, RADIUS_SMALL),
    buildStairMorph(geo2, RADIUS_SMALL),
  ];
  geo1.morphTargetsRelative = false;
  geo2.morphTargetsRelative = false;

  const sphere1 = new THREE.Mesh(geo1, materialLarge);
  sphere1.castShadow = true;
  sphere1.receiveShadow = true;
  sphere1.layers.enable(1);
  scene.add(sphere1);

  const sphere2 = new THREE.Mesh(geo2, materialSmall);
  sphere2.castShadow = true;
  sphere2.receiveShadow = true;
  sphere2.layers.enable(2);
  scene.add(sphere2);

  const wire1 = new THREE.Mesh(geo1, wireLargeMat);
  wire1.castShadow = false;
  wire1.receiveShadow = false;
  wire1.layers.enable(1);
  scene.add(wire1);

  const wire2 = new THREE.Mesh(geo2, wireSmallMat);
  wire2.castShadow = false;
  wire2.receiveShadow = false;
  wire2.layers.enable(2);
  scene.add(wire2);

  sphere1.rotation.y = 0.5;
  sphere2.rotation.y = -0.7;

  const ORBIT_COUNT = 4;
  const MORPH_PER_CYCLE = [1, 0, 2, 3];

  function smoothstep(lo, hi, x) {
    const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
  }

  const servicesSection = canvas.closest('.services_wrap') || canvas.closest('.services_grid');

  const clock = new THREE.Clock();

  const updatePositions = () => {
    const t = clock.getElapsedTime();

    let progress = 0;
    if (servicesSection) {
      const rect = servicesSection.getBoundingClientRect();
      const sectionHeight = servicesSection.offsetHeight;
      const viewHeight = window.innerHeight;
      const raw = (viewHeight - rect.top) / (sectionHeight + viewHeight);
      progress = Math.min(Math.max(raw, 0), 1);
    }

    // Animate positions
    const totalAngle = progress * Math.PI * 2 * ORBIT_COUNT;
    const orbitRadius = 1.15;
    const centerY = 0;
    let x1 = Math.cos(totalAngle + Math.PI) * orbitRadius + 0.2;
    let z1 = Math.sin(totalAngle + Math.PI) * 0.38;
    let x2 = Math.cos(totalAngle) * orbitRadius - 0.2;
    let z2 = Math.sin(totalAngle) * 0.48;

    const cycleFloat = progress * ORBIT_COUNT;
    const cycleIndex = Math.min(Math.floor(cycleFloat), ORBIT_COUNT - 1);
    const cycleProgress = cycleFloat - cycleIndex;
    const bell = Math.sin(cycleProgress * Math.PI);
    const morphStrength = smoothstep(0.3, 1.0, bell);
    const activeMorph = MORPH_PER_CYCLE[cycleIndex] ?? 0;

    // --- Animated color blending ---  
    const blendFactor = (Math.sin(t) + 1) / 2; // 0 → 1
    _cLarge.copy(COLORS_LARGE[0]).lerp(COLORS_LARGE[1], blendFactor).lerp(COLORS_LARGE[2], blendFactor * 0.5);
    _cSmall.copy(COLORS_SMALL[0]).lerp(COLORS_SMALL[1], blendFactor).lerp(COLORS_SMALL[2], blendFactor * 0.5);
    _cWire.copy(WIRE_COLORS[0]).lerp(WIRE_COLORS[1], blendFactor).lerp(WIRE_COLORS[2], blendFactor * 0.5);

    materialLarge.color.copy(_cLarge);
    materialSmall.color.copy(_cSmall);
    wireLargeMat.color.copy(_cWire);
    wireSmallMat.color.copy(_cWire);

    materialLarge.envMapIntensity = 0.75 + morphStrength * 0.35;
    materialSmall.envMapIntensity = 0.85 + morphStrength * 0.3;

    materialLarge.metalness = 0.05 + morphStrength * 0.08;
    materialSmall.metalness = 0.04 + morphStrength * 0.08;

    const wireOpacity = morphStrength * 0.12;
    wireLargeMat.opacity = wireOpacity;
    wireSmallMat.opacity = wireOpacity;

    // Morph influences
    sphere1.morphTargetInfluences.fill(0);
    sphere2.morphTargetInfluences.fill(0);
    wire1.morphTargetInfluences.fill(0);
    wire2.morphTargetInfluences.fill(0);
    sphere1.morphTargetInfluences[activeMorph] = morphStrength;
    sphere2.morphTargetInfluences[activeMorph] = morphStrength;
    wire1.morphTargetInfluences[activeMorph] = morphStrength;
    wire2.morphTargetInfluences[activeMorph] = morphStrength;

    sphere1.position.set(x1, centerY, z1);
    sphere2.position.set(x2, centerY, z2);
    wire1.position.copy(sphere1.position);
    wire2.position.copy(sphere2.position);
    wire1.rotation.copy(sphere1.rotation);
    wire2.rotation.copy(sphere2.rotation);

    sphere1.rotation.y += 0.0022;
    sphere2.rotation.y -= 0.0017;

    renderer.render(scene, camera);
    requestAnimationFrame(updatePositions);
  };

  updatePositions();

  window.addEventListener('resize', () => {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
};

    // ── Lenis Smooth Scroll (uses npm import now) ──
    const initLenis = () => {
      const lenis = new Lenis({
        lerp: 0.1,
        wheelMultiplier: 0.9,
        gestureOrientation: 'vertical',
        normalizeWheel: false,
        smoothTouch: false,
      });
      window.lenis = lenis;
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    };

    // ── Smart Navbar: hidden by default after hero, only reveals on scroll up ──
    const initSmartNav = () => {
      const nav = document.querySelector('.nav_wrap');
      const hero = document.querySelector('.hero_wrap');
      if (!nav || !hero) return;

      const navInner = nav.querySelector('.nav-component') || nav.querySelector('.nav_contain');
      if (navInner) {
        navInner.style.display = 'flex';
        navInner.style.alignItems = 'center';
      }

      let lastY = 0;
      let hidden = true;
      let isFixed = false;
      const THRESHOLD = 5;

      const activate = () => {
        if (isFixed) return;
        isFixed = true;
        hidden = true;

        Object.assign(nav.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: '50',
          background: '#0c002e',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          paddingTop: '0.75rem',
          paddingBottom: '0.75rem',
          transition: 'none',
          transform: 'translateY(-100%)',
        });

        nav.offsetHeight;
        nav.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      };

      const deactivate = () => {
        if (!isFixed) return;
        isFixed = false;
        hidden = true;
        Object.assign(nav.style, {
          position: '',
          top: '',
          left: '',
          right: '',
          background: '',
          borderBottom: '',
          paddingTop: '',
          paddingBottom: '',
          transition: '',
          transform: '',
        });
      };

      const update = () => {
        const y = window.scrollY || document.documentElement.scrollTop;
        const heroBottom = hero.offsetTop + hero.offsetHeight;

        if (y < heroBottom) {
          deactivate();
          lastY = y;
          return;
        }

        activate();

        const delta = y - lastY;

        if (delta > THRESHOLD && !hidden) {
          nav.style.transform = 'translateY(-100%)';
          hidden = true;
        } else if (delta < -THRESHOLD && hidden) {
          nav.style.transform = 'translateY(0)';
          hidden = false;
        }

        lastY = y;
      };

      if (window.lenis) {
        window.lenis.on('scroll', update);
      }
      window.addEventListener('scroll', update, { passive: true });
    };

    const initHeroParallax = () => {
      const heroWrap = document.querySelector('.hero_wrap');
      const heroVideo = document.querySelector('.hero_bg-video video')
                     || document.querySelector('.hero_bg-video');
      if (!heroWrap || !heroVideo) return;

      heroVideo.style.willChange = 'transform';

      const update = () => {
        const rect = heroWrap.getBoundingClientRect();
        const heroHeight = heroWrap.offsetHeight;
        const progress = Math.min(Math.max(-rect.top / heroHeight, 0), 1);
        const scale = 1 + progress * 1.2;
        heroVideo.style.transform = `scale(${scale})`;
      };

      if (window.lenis) {
        window.lenis.on('scroll', update);
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
    };

    const initSectionReveals = () => {
      // ── Services ──
      document.querySelectorAll('.services_item').forEach((item) => {
        const number = item.querySelector('.services_item_number');
        const heading = item.querySelector('.services_item_heading');
        const content = item.querySelector('.services_item_content');

        [number, heading, content].forEach((el) => {
          if (!el) return;
          el.style.opacity = '0';
          el.style.transform = 'translate3d(0, 2.5rem, 0)';
        });
      });

      const servicesObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const item = entry.target;
          const number = item.querySelector('.services_item_number');
          const heading = item.querySelector('.services_item_heading');
          const content = item.querySelector('.services_item_content');

          [number, heading, content].forEach((el, i) => {
            if (!el) return;
            setTimeout(() => {
              el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
              el.style.opacity = '1';
              el.style.transform = 'translate3d(0, 0, 0)';
            }, i * 120);
          });

          servicesObserver.unobserve(item);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

      document.querySelectorAll('.services_item').forEach((item) => servicesObserver.observe(item));

      // ── Projects ──
      document.querySelectorAll('.projects_item_wrap').forEach((wrap) => {
        wrap.style.opacity = '0';
        wrap.style.transform = 'translate3d(0, 3rem, 0)';
      });

      const projectsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translate3d(0, 0, 0)';

          projectsObserver.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

      document.querySelectorAll('.projects_item_wrap').forEach((wrap) => projectsObserver.observe(wrap));
    };

    const initPartnersReveal = () => {
      const marqueeOuter = document.querySelector('.partners_marquee-outer');
      if (!marqueeOuter) return;

      const check = () => {
        if (marqueeOuter.classList.contains('is-revealed')) return;

        const rect = marqueeOuter.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          marqueeOuter.classList.add('is-revealed');
        }
      };

      check();
      requestAnimationFrame(check);
      setTimeout(check, 200);
      setTimeout(check, 600);
      setTimeout(check, 1200);

      const onScroll = () => {
        check();
        if (marqueeOuter.classList.contains('is-revealed')) {
          window.removeEventListener('scroll', onScroll);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });

      if (window.lenis) {
        window.lenis.on('scroll', check);
      }
    };

    const initFAQ = () => {
  const items = document.querySelectorAll('.faq_item');
  if (!items.length) return;

  const faqHeader = document.querySelector('.faq_header');
  if (faqHeader) {
    faqHeader.style.display = 'flex';
    faqHeader.style.justifyContent = 'space-between';
    faqHeader.style.alignItems = 'flex-start';
  }

  items.forEach((item) => {
    const btn = item.querySelector('.faq_question');
    const answer = item.querySelector('.faq_answer');
    const oldIcon = btn?.querySelector('.faq_icon');

    if (!btn || !answer) return;

    answer.style.overflow = 'hidden';
    answer.style.maxHeight = '0';
    answer.style.transition = 'max-height 0.55s cubic-bezier(0.16, 1, 0.3, 1)';

    // Style the question text for animated gradient
const questionText = btn.querySelector('.faq_question_text');
if (questionText) {
  questionText.style.position = 'relative';
  questionText.style.transition = 'color 0.4s ease';

  // Create gradient overlay that fades in
  const gradientClone = document.createElement('span');
  gradientClone.textContent = questionText.textContent;
  Object.assign(gradientClone.style, {
    position: 'absolute',
    inset: '0',
    background: 'linear-gradient(90deg, #F0060D 0%, #C924D7 49%, #7904FD 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    opacity: '0',
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none',
  });
  questionText.style.display = 'inline-block';
  questionText.appendChild(gradientClone);
  questionText._gradientClone = gradientClone;
}

    if (oldIcon) {
  oldIcon.textContent = '';
  Object.assign(oldIcon.style, {
    width: '20px',
    height: '20px',
    minWidth: '20px',
    position: 'relative',
    flexShrink: '0',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease, border-color 0.4s ease',
    transform: 'rotate(0deg)',
  });

  const line1 = document.createElement('span');
  const line2 = document.createElement('span');

  const lineStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '9px',
    height: '1.5px',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '1px',
    transition: 'background 0.4s ease',
  };

  Object.assign(line1.style, lineStyle);
  line1.style.transform = 'translate(-50%, -50%)';

  Object.assign(line2.style, lineStyle);
  line2.style.transform = 'translate(-50%, -50%) rotate(90deg)';

  oldIcon.appendChild(line1);
  oldIcon.appendChild(line2);
}
  });

const openItem = (item) => {
  const btn = item.querySelector('.faq_question');
  const answer = item.querySelector('.faq_answer');
  const icon = btn?.querySelector('.faq_icon');
  const questionText = btn?.querySelector('.faq_question_text');

  btn.setAttribute('aria-expanded', 'true');
  item.classList.add('is-open');

  answer.style.maxHeight = answer.scrollHeight + 'px';

  if (icon) {
    icon.style.transform = 'rotate(45deg)';
    icon.style.background = 'linear-gradient(135deg, #F0060D, #C924D7, #7904FD)';
    icon.style.borderColor = 'transparent';
    const lines = icon.querySelectorAll('span');
    lines.forEach(l => { l.style.background = '#fff'; });
  }

  if (questionText && questionText._gradientClone) {
    questionText._gradientClone.style.opacity = '1';
  }

  const onEnd = () => {
    if (item.classList.contains('is-open')) {
      answer.style.maxHeight = 'none';
    }
    answer.removeEventListener('transitionend', onEnd);
  };
  answer.addEventListener('transitionend', onEnd);
};

const closeItem = (item) => {
  const btn = item.querySelector('.faq_question');
  const answer = item.querySelector('.faq_answer');
  const icon = btn?.querySelector('.faq_icon');
  const questionText = btn?.querySelector('.faq_question_text');

  btn.setAttribute('aria-expanded', 'false');
  item.classList.remove('is-open');

  answer.style.maxHeight = answer.scrollHeight + 'px';
  answer.offsetHeight;
  answer.style.maxHeight = '0';

  if (icon) {
    icon.style.transform = 'rotate(0deg)';
    icon.style.background = 'transparent';
    icon.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    const lines = icon.querySelectorAll('span');
    lines.forEach(l => { l.style.background = 'rgba(255, 255, 255, 0.5)'; });
  }

  if (questionText && questionText._gradientClone) {
    questionText._gradientClone.style.opacity = '0';
  }
};
  items.forEach((item) => {
    const btn = item.querySelector('.faq_question');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      items.forEach((other) => {
        if (other !== item && other.classList.contains('is-open')) {
          closeItem(other);
        }
      });

      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });
  });
};

    const initArticlesSocialReveal = () => {
      const articlesHeader = document.querySelector('.articles-promo_header');
      const articlesCards = document.querySelector('.articles-promo_cards');
      const articlesFooter = document.querySelector('.articles-promo_footer');

      if (articlesHeader) {
        articlesHeader.style.opacity = '0';
        articlesHeader.style.transform = 'translate3d(0, 2.5rem, 0)';
      }
      if (articlesCards) {
        articlesCards.style.opacity = '0';
        articlesCards.style.transform = 'translate3d(0, 3rem, 0)';
      }
      if (articlesFooter) {
        articlesFooter.style.opacity = '0';
        articlesFooter.style.transform = 'translate3d(0, 2rem, 0)';
      }

      const articlesObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (articlesHeader) {
            articlesHeader.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
            articlesHeader.style.opacity = '1';
            articlesHeader.style.transform = 'translate3d(0, 0, 0)';
          }

          if (articlesCards) {
            setTimeout(() => {
              articlesCards.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
              articlesCards.style.opacity = '1';
              articlesCards.style.transform = 'translate3d(0, 0, 0)';
            }, 250);
          }

          if (articlesFooter) {
            setTimeout(() => {
              articlesFooter.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
              articlesFooter.style.opacity = '1';
              articlesFooter.style.transform = 'translate3d(0, 0, 0)';
            }, 500);
          }

          articlesObserver.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

      const articlesSection = document.querySelector('.articles-promo_inner');
      if (articlesSection) articlesObserver.observe(articlesSection);

      const socialHeader = document.querySelector('.social-section_header');
      const blogComponent = document.querySelector('.section_blog .blog-component');

      if (socialHeader) {
        socialHeader.style.opacity = '0';
        socialHeader.style.transform = 'translate3d(0, 2.5rem, 0)';
      }

      const embed = blogComponent?.querySelector('.swiper_blog-component');
      if (embed) {
        embed.style.opacity = '0';
        embed.style.transform = 'translate3d(0, 2.5rem, 0)';
      }

      if (blogComponent) {
        const socialObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            if (socialHeader) {
              socialHeader.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
              socialHeader.style.opacity = '1';
              socialHeader.style.transform = 'translate3d(0, 0, 0)';
            }

            if (embed) {
              setTimeout(() => {
                embed.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                embed.style.opacity = '1';
                embed.style.transform = 'translate3d(0, 0, 0)';
              }, 250);
            }

            socialObserver.unobserve(entry.target);
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

        socialObserver.observe(blogComponent);
      }

const elfsightContainer = document.querySelector('.elfsight-app-aafa18f0-0e7e-4ff0-a44e-5c047f44429b');
if (elfsightContainer) {
  const CARD_SELECTOR = '[class*="CardContainer"]';

  const animateItems = (items) => {
    // Only animate items that haven't been animated yet
    const fresh = Array.from(items).filter(item => !item.dataset.animated);
    if (!fresh.length) return;

    fresh.forEach((item, i) => {
      item.dataset.animated = 'true';
      item.style.opacity = '0';
      item.style.transform = 'translate3d(0, 2.5rem, 0)';
      item.style.transition = 'none';

      setTimeout(() => {
        item.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        item.style.opacity = '1';
        item.style.transform = 'translate3d(0, 0, 0)';
      }, 100 * i);
    });
  };

  // Watch for initial load + any dynamic additions
  const feedObserver = new MutationObserver(() => {
    const items = elfsightContainer.querySelectorAll(CARD_SELECTOR);
    if (items.length) animateItems(items);
  });

  feedObserver.observe(elfsightContainer, {
    childList: true,
    subtree: true,
  });

  // Handle "Load More" clicks — Elfsight adds cards after a network fetch
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[class*="load-more"], [class*="LoadMore"]');
    if (!btn) return;

    // Poll for new cards since Elfsight fetches them async
    let attempts = 0;
    const poll = setInterval(() => {
      const fresh = elfsightContainer.querySelectorAll(`${CARD_SELECTOR}:not([data-animated])`);
      if (fresh.length) {
        clearInterval(poll);
        animateItems(fresh);
      }
      if (++attempts > 20) clearInterval(poll); // give up after 4s
    }, 200);
  });
}
    };

    const initScrollAnimations = () => {
      document.querySelectorAll('.alp-animate-slide').forEach((el) => {
        el.style.overflow = 'hidden';
      });

      document.querySelectorAll('.form-header').forEach(el => {
        el.style.transform = 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
      });

      const partnersObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            partnersObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.partners_marquee-outer').forEach((el) => partnersObserver.observe(el));

      const marqueeOuter = document.querySelector('.partners_marquee-outer');
      if (marqueeOuter) {
        const revealMarquee = () => {
          const rect = marqueeOuter.getBoundingClientRect();
          if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
            marqueeOuter.classList.add('is-revealed');
          } else {
            const po = new IntersectionObserver((entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('is-revealed');
                  po.unobserve(entry.target);
                }
              });
            }, { threshold: 0, rootMargin: '200px 0px 200px 0px' });
            po.observe(marqueeOuter);
          }
        };

        revealMarquee();
        setTimeout(revealMarquee, 100);
        setTimeout(revealMarquee, 500);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.style.opacity = '1';
              entry.target.style.transform =
                'translate3d(0, 0, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
              entry.target.style.transition =
                'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)';
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
      );

      const selectors = [
        '.about_list',
        '.nav-component',
        '.services_item',
        '.services_contain',
        '.services_grid',
        '.work_paragraph',
        '.team_heading',
        '.heading-style-h5',
        '.subtitle-team',
        '.testemonials-item_dot',
        '.text-size-24-18',
        '.form-header',
        '.form-button',
        '.button-contact',
        '.section_blog .heading',
        '.section_blog h2',
        '[data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f42"]',
        '[data-w-id="1c718dab-b4cb-cfe7-13e8-ab3f7368a01e"]',
      ];

      const allTargets = new Set();

      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => allTargets.add(el));
      });

      document.querySelectorAll('[data-w-id]').forEach((el) => {
        if (el.closest('.services_illustration')) return;
        if (el.closest('.hero_wrap')) return;
        const style = el.style;
        if (
          style.opacity === '0' ||
          (style.transform && style.transform.includes('100%'))
        ) {
          allTargets.add(el);
        }
      });

      document.querySelectorAll('.section_cta [data-w-id]').forEach((el) => {
        allTargets.add(el);
      });

      document.querySelectorAll('.form-button, .button-contact').forEach((el) => {
        el.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
        el.style.opacity = '1';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      });

      document.querySelectorAll('.cta-wrapper [data-w-id]').forEach((el) => allTargets.delete(el));

      allTargets.forEach((el) => {
        if (el.closest('.services_illustration')) return;
        observer.observe(el);
      });

      const ctaHeadings = document.querySelectorAll('.cta-wrapper .header-animation h2');
      ctaHeadings.forEach((el) => {
        el.style.transform = 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
        el.style.overflow = 'hidden';
      });

      const workObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const heading = entry.target.querySelector('.work_heading');
            if (heading) {
              heading.style.transition = 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
              heading.style.opacity = '1';
              heading.style.transform = 'translate3d(0, 0%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
            }
            workObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });

      document.querySelectorAll('.work_header-wrapper').forEach((el) => workObserver.observe(el));

      const ctaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const headings = entry.target.querySelectorAll('.header-animation h2');
            headings.forEach((el, i) => {
              setTimeout(() => {
                el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
                el.style.transform = 'translate3d(0, 0%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
              }, i * 120);
            });
            ctaObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 1 });

      document.querySelectorAll('.cta-wrapper, .formtext').forEach((el) => ctaObserver.observe(el));

      const teamObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const overlay = entry.target.querySelector('.team_image-overlay');
            if (overlay) {
              overlay.style.transition = 'height 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
              overlay.style.height = '0%';
            }
            teamObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4, rootMargin: '0px 0px -100px 0px' });

      document.querySelectorAll('.team_image-wrapper').forEach((el) => {
        const overlay = el.querySelector('.team_image-overlay');
        if (overlay) overlay.style.height = '100%';
        teamObserver.observe(el);
      });
    };

    const initWorkHover = () => {
      const FADE = '0.4s ease';

      document.querySelectorAll('.work_items-wrapper .work-item').forEach((item) => {
        const wrapper = item.querySelector('.work_image-wrapper');
        if (!wrapper) return;
        const imgEl = wrapper.querySelector('.work-image');
        if (!imgEl) return;

        wrapper.classList.remove('work_image-wrapper');
        wrapper.classList.add('work_image-hover');

        item.style.position = 'relative';
        item.style.overflow = 'visible';
        item.style.cursor = 'default';

        const SIZE = 160;
        const HALF = SIZE / 2;
        const LERP = 0.08;

        Object.assign(wrapper.style, {
          position: 'absolute',
          width: SIZE + 'px',
          height: SIZE + 'px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: '0',
          pointerEvents: 'none',
          zIndex: '0',
          transform: 'translate(-50%, -50%)',
          transition: 'opacity ' + FADE,
          willChange: 'left, top',
        });

        Object.assign(imgEl.style, {
          width: '100%',
          height: '100%',
          maxWidth: SIZE + 'px',
          maxHeight: SIZE + 'px',
          objectFit: 'contain',
          opacity: '1',
          display: 'block',
          transform: 'scale(0.85)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        });

        let mouseX = 0, mouseY = 0;
        let currentX = 0, currentY = 0;
        let rafId = null;
        let isHovering = false;

        const clamp = (rawX, rawY, w, h) => {
          const rightEdge = w - HALF;
          const leftBound = w * 0.5;
          const range = rightEdge - leftBound;
          const t = Math.max(0, Math.min(1, rawX / w));
          const biased = Math.sqrt(t);
          const x = leftBound + biased * range;
          const y = Math.max(0, Math.min(rawY, h));
          return { x, y };
        };

        const tick = () => {
          if (!isHovering) { rafId = null; return; }

          const rect = item.getBoundingClientRect();
          const { x: tx, y: ty } = clamp(mouseX, mouseY, rect.width, rect.height);

          currentX += (tx - currentX) * LERP;
          currentY += (ty - currentY) * LERP;

          wrapper.style.left = currentX + 'px';
          wrapper.style.top = currentY + 'px';

          rafId = requestAnimationFrame(tick);
        };

        item.addEventListener('mouseenter', (e) => {
          isHovering = true;
          const rect = item.getBoundingClientRect();
          mouseX = e.clientX - rect.left;
          mouseY = e.clientY - rect.top;

          const { x, y } = clamp(mouseX, mouseY, rect.width, rect.height);
          currentX = x;
          currentY = y;
          wrapper.style.left = x + 'px';
          wrapper.style.top = y + 'px';
          wrapper.style.opacity = '1';
          imgEl.style.transform = 'scale(1)';

          if (!rafId) rafId = requestAnimationFrame(tick);
        });

        item.addEventListener('mousemove', (e) => {
          const rect = item.getBoundingClientRect();
          mouseX = e.clientX - rect.left;
          mouseY = e.clientY - rect.top;
        });

        item.addEventListener('mouseleave', () => {
          isHovering = false;
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
          wrapper.style.opacity = '0';
          imgEl.style.transform = 'scale(0.85)';
        });
      });
    };

    const initTestimonialReveal = () => {
      const items = document.querySelectorAll('.testemonials-item');
      if (!items.length) return;

      items.forEach((item) => {
        const text = item.querySelector('.text-size-24-18');
        const author = item.querySelector('.testemonials-item_name');

        if (text) {
          text.style.transform = 'translate3d(0, 100%, 0)';
        }

        if (author) {
          const clipWrapper = document.createElement('div');
          clipWrapper.style.overflow = 'hidden';
          author.parentNode.insertBefore(clipWrapper, author);
          clipWrapper.appendChild(author);
          author.style.transform = 'translate3d(0, 100%, 0)';
        }
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const text = entry.target.querySelector('.text-size-24-18');
          const author = entry.target.querySelector('.testemonials-item_name');

          if (text) {
            text.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
            text.style.transform = 'translate3d(0, 0%, 0)';
          }

          if (author) {
            setTimeout(() => {
              author.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
              author.style.transform = 'translate3d(0, 0%, 0)';
            }, 400);
          }

          observer.unobserve(entry.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -80px 0px' });

      items.forEach((item) => observer.observe(item));
    };

    const initWorkAnimations = () => {
      const items = document.querySelectorAll('.work_items-wrapper .work-item');
      if (!items.length) return;

      items.forEach((item) => {
        const line = item.querySelector('.work-item_line');
        if (line) {
          line.style.width = '0%';
          line.style.transition = 'none';
        }
        const numEl = item.querySelector('[fs-numbercount-element="number"]');
        if (numEl) numEl.textContent = '0';
      });

      const animateNumber = (el, end, duration) => {
        const start = 0;
        const startTime = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);

        const step = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = ease(progress);
          const current = Math.round(start + (end - start) * easedProgress);
          el.textContent = current.toLocaleString();
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = end.toLocaleString();
          }
        };

        requestAnimationFrame(step);
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const item = entry.target;

            const line = item.querySelector('.work-item_line');
            if (line) {
              requestAnimationFrame(() => {
                line.style.transition = 'width 1s cubic-bezier(0.16, 1, 0.3, 1)';
                line.style.width = '100%';
              });
            }

            const numEl = item.querySelector('[fs-numbercount-element="number"]');
            if (numEl) {
              const end = parseInt(numEl.getAttribute('fs-numbercount-end'), 10);
              if (!isNaN(end)) {
                setTimeout(() => animateNumber(numEl, end, 1800), 300);
              }
            }

            observer.unobserve(item);
          });
        },
        { threshold: 0.3, rootMargin: '0px 0px -60px 0px' }
      );

      items.forEach((item) => observer.observe(item));
    };

    const initHeroAnimation = () => {
      const heroWrap = document.querySelector('.hero_wrap');
      if (!heroWrap) return;

      const headingTexts = heroWrap.querySelectorAll('.heading_text, .text-color-gradiant');
      headingTexts.forEach((el, i) => {
        setTimeout(() => {
          el.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translate3d(0, 0%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
        }, 300 + i * 150);
      });

      const heroLine = heroWrap.querySelector('.line-separate.is--hero');
      if (heroLine) {
        setTimeout(() => {
          heroLine.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          heroLine.style.opacity = '1';
          heroLine.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1)';
        }, 700);
      }

      const bottomEls = heroWrap.querySelectorAll(
        '.hero_bottom_paragraph, .text-button_list:not(.is-animated), .bottom_buttons-wrapper .text-button_list:not(.is-animated)'
      );
      bottomEls.forEach((el) => {
        setTimeout(() => {
          el.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translate3d(0, 0%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
        }, 900);
      });

      const navComponent = document.querySelector('.nav-component');
      if (navComponent) {
        const navEls = [
          navComponent.querySelector('.nav_logo-wrapper'),
          navComponent.querySelector('.nav_buttons-wrapper'),
        ].filter(Boolean);

        navEls.forEach((el) => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(-1rem)';
        });

        setTimeout(() => {
          navEls.forEach((el) => {
            el.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
        }, 300);
      }
    };

    // ════════════════════════════════════════════════════════════
    // initModals — WITH ALL 3 FIXES APPLIED
    // FIX 1: Guard animateBackdrop + backdrop cleanup against null _material
    // FIX 2: Crossfade phantom → modal display (no instant swap flash)
    // FIX 3: try/finally in closeModal so DOM always restores
    // ════════════════════════════════════════════════════════════
    const initModals = async () => {
  const THREE = await import('three');

  const backdropVert = `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const backdropFrag = `
    precision highp float;
    uniform float uProgress;
    uniform float uTime;
    uniform vec2  uResolution;

    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v){
      const vec4 C=vec4(0.211324865405187,0.366025403784439,
                        -0.577350269189626,0.024390243902439);
      vec2 i=floor(v+dot(v,C.yy));
      vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
      vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
      i=mod289(i);
      vec3 p=permute(permute(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
      vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
      m=m*m; m=m*m;
      vec3 x_=2.0*fract(p*C.www)-1.0;
      vec3 h=abs(x_)-0.5;
      vec3 ox=floor(x_+0.5);
      vec3 a0=x_-ox;
      m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
      vec3 g;
      g.x=a0.x*x0.x+h.x*x0.y;
      g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.0*dot(m,g);
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uResolution;
      float n = snoise(uv * 3.0 + uTime * 0.15) * 0.015
              + snoise(uv * 7.0 - uTime * 0.1) * 0.008;
      float base = uProgress * 0.85;
      float noiseEdge = smoothstep(0.0, 0.4, uProgress) * n;
      vec3 deepPurple = vec3(0.047, 0.0, 0.18);
      vec3 dark       = vec3(0.0, 0.0, 0.0);
      vec3 col = mix(dark, deepPurple, 0.3 + snoise(uv * 2.0 + uTime * 0.05) * 0.15);
      float edgeGlow = smoothstep(base - 0.15, base, uProgress)
                     * smoothstep(base + 0.15, base, uProgress - 0.3);
      vec3 accent = vec3(0.45, 0.06, 0.85);
      col += accent * edgeGlow * 0.2 * uProgress;
      float alpha = clamp(base + noiseEdge, 0.0, 0.85);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  let _canvas, _renderer, _scene, _camera, _material, _raf;

  function ensureRenderer() {
    if (_canvas) return;
    _canvas = document.createElement('canvas');
    Object.assign(_canvas.style, {
      position: 'fixed', inset: '0',
      width: '100vw', height: '100vh',
      zIndex: '998', pointerEvents: 'none',
      opacity: '0', transition: 'opacity 0.4s ease',
    });
    _renderer = new THREE.WebGLRenderer({ canvas: _canvas, alpha: true, antialias: false });
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    _scene = new THREE.Scene();
    _material = new THREE.ShaderMaterial({
      vertexShader: backdropVert, fragmentShader: backdropFrag,
      uniforms: {
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 },
      },
      transparent: true, depthTest: false,
    });
    _scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), _material));
    window.addEventListener('resize', () => {
      _renderer.setSize(window.innerWidth, window.innerHeight);
      _material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });
  }

  function startBackdropLoop() {
    ensureRenderer();
    if (!_canvas.parentNode) document.body.appendChild(_canvas);
    requestAnimationFrame(() => { _canvas.style.opacity = '1'; });
    function tick(now) {
      _material.uniforms.uTime.value = now * 0.001;
      _renderer.render(_scene, _camera);
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);
  }

  function stopBackdropLoop() { if (_raf) { cancelAnimationFrame(_raf); _raf = null; } }

  function hideCanvas() {
    if (!_canvas) return;
    _canvas.style.opacity = '0';
    setTimeout(() => { if (_canvas.parentNode) _canvas.remove(); }, 450);
  }

  // ← FIX 1: Guard against _material being undefined
  function animateBackdrop(from, to, ms) {
    return new Promise(resolve => {
      if (!_material) { resolve(); return; }                     // ← FIX 1
      const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const t0 = performance.now();
      function step() {
        const p = Math.min((performance.now() - t0) / ms, 1);
        _material.uniforms.uProgress.value = from + (to - from) * ease(p);
        if (p < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  const cubicOut = t => 1 - Math.pow(1 - t, 3);
  const cubicInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function animateValue(from, to, ms, easeFn, onUpdate) {
    return new Promise(resolve => {
      const t0 = performance.now();
      function step() {
        const p = Math.min((performance.now() - t0) / ms, 1);
        onUpdate(from + (to - from) * easeFn(p));
        if (p < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ─── Inject scrollbar-hiding styles once ─── */
  if (!document.getElementById('modal-scrollbar-hide')) {
    const style = document.createElement('style');
    style.id = 'modal-scrollbar-hide';
    style.textContent = `
      .modal_wrap {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .modal_wrap::-webkit-scrollbar {
        display: none;
      }
      .modal {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .modal::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Click handlers ─── */
  document.querySelectorAll('.projects_item_wrap').forEach(element => {
    element.addEventListener('click', async () => {
      const clickedItem = element.querySelector('.projects_item');
      const isMobile = window.matchMedia('(max-width: 479px)').matches;
      const isTablet = window.matchMedia('(max-width: 767px)').matches;
      const targetWidthPct = isMobile ? 90 : isTablet ? 85 : 80;

      document.body.style.overflow = 'hidden';
      if (window.lenis) window.lenis.stop();

      const cardDisplay = clickedItem.querySelector('.projects_item_display');
      const cardImg = cardDisplay?.querySelector('.projects_visual_img');
      const cardRect = (cardImg || cardDisplay || clickedItem).getBoundingClientRect();

      /* — Don't hide original yet — */
      const originalOpacity = element.style.opacity;

      const modalWrap = document.createElement('div');
      const overlay = document.createElement('div');
      const modal = document.createElement('div');

      modalWrap.classList.add('modal_wrap', 'background-color-white');

      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: '999',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        opacity: '0',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
      });

      modal.classList.add('modal');
      modal.innerHTML = clickedItem.innerHTML;
      modal.setAttribute('data-lenis-prevent', '');

      const display = modal.querySelector('.projects_item_display');
      const content = modal.querySelectorAll('.projects_item_content');
      const indication = display?.querySelectorAll('.projects_modal_indication');
      const thumbnail = modal.querySelector('.projects_item_cover-img');
      const closeBtn = modal.querySelector('.projects_modal-close_btn');

      const targetTop = window.innerHeight * 0.05;
      const targetLeft = (100 - targetWidthPct) / 2;

      Object.assign(modal.style, {
        position: 'absolute', zIndex: '1000',
        top: `${targetTop}px`, left: `${targetLeft}%`,
        width: `${targetWidthPct}%`, height: 'max-content',
        borderRadius: '1.25rem', overflow: 'hidden',
        opacity: '0', visibility: 'hidden',
        willChange: 'transform, opacity',
      });

      if (thumbnail) thumbnail.style.opacity = '0';
      if (display) {
        display.style.backgroundColor = '#FFFFFF';
        display.style.opacity = '0';
      }

      content.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(2rem)'; });
      if (indication) indication.forEach(ind => { ind.style.opacity = '0'; });

      document.body.appendChild(modalWrap);
      modalWrap.appendChild(overlay);
      modalWrap.appendChild(modal);
      modalWrap.style.overflowY = 'hidden';

      /* — Phantom clone — */
      const phantom = document.createElement('div');
      const phantomImg = (cardImg || cardDisplay).cloneNode(true);

      Object.assign(phantom.style, {
        position: 'fixed', zIndex: '1001',
        top: `${cardRect.top}px`, left: `${cardRect.left}px`,
        width: `${cardRect.width}px`, height: `${cardRect.height}px`,
        borderRadius: '0.75rem', overflow: 'hidden',
        boxShadow: '0 4px 30px rgba(12, 0, 46, 0.25)',
        willChange: 'top, left, width, height, border-radius, box-shadow, opacity',
        pointerEvents: 'none',
      });

      Object.assign(phantomImg.style, {
        width: '100%', height: '100%',
        objectFit: 'cover', display: 'block',
        position: 'absolute', inset: '0',
      });
      phantomImg.className = '';
      phantom.appendChild(phantomImg);
      document.body.appendChild(phantom);

      /* — Hide original in same frame as phantom appears — */
      element.style.transition = 'none';
      element.style.opacity = '0';

      /* — Step 1: Overlay + backdrop — */
      // startBackdropLoop();
      // animateBackdrop(0, 1, 500);
      await new Promise(r => requestAnimationFrame(r));
      overlay.style.opacity = '1';

      /* — Measure target — */
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
      await new Promise(r => requestAnimationFrame(r));

      const modalDisplay = modal.querySelector('.projects_item_display');
      const modalRect = modalDisplay.getBoundingClientRect();

      const flyStart = {
        top: cardRect.top, left: cardRect.left,
        width: cardRect.width, height: cardRect.height, radius: 12,
      };
      const flyEnd = {
        top: modalRect.top, left: modalRect.left,
        width: modalRect.width, height: modalRect.height, radius: 16,
      };

      /* — Step 2: Fly phantom — */
      await animateValue(0, 1, 500, cubicOut, (p) => {
        phantom.style.top    = lerp(flyStart.top, flyEnd.top, p) + 'px';
        phantom.style.left   = lerp(flyStart.left, flyEnd.left, p) + 'px';
        phantom.style.width  = lerp(flyStart.width, flyEnd.width, p) + 'px';
        phantom.style.height = lerp(flyStart.height, flyEnd.height, p) + 'px';
        phantom.style.borderRadius = lerp(flyStart.radius, flyEnd.radius, p) + 'px';
        const s = lerp(15, 60, p);
        phantom.style.boxShadow = `0 ${s * 0.4}px ${s}px rgba(12, 0, 46, ${lerp(0.25, 0.45, p)})`;
      });

      /* — Step 3: Modal fade in (display area hidden) — */
      modal.style.visibility = 'visible';
      modal.style.transform = 'scale(0.97) translateY(8px)';
      modal.style.opacity = '0';

      await animateValue(0, 1, 300, cubicOut, (p) => {
        const scale = 0.97 + p * 0.03;
        const translateY = (1 - p) * 8;
        modal.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        modal.style.opacity = String(p);
        modal.style.borderRadius = lerp(20, 16, p) + 'px';
        const s = p * 60;
        modal.style.boxShadow = `0 ${s * 0.4}px ${s}px rgba(12, 0, 46, ${p * 0.35})`;
      });

      /* — Step 4: Crossfade swap — */                          // ← FIX 2 START
      // Show display underneath phantom first
      if (display) {
        display.style.transition = 'none';
        display.style.opacity = '1';
      }

      // Force synchronous layout so display is painted before phantom fades
      if (display) display.offsetHeight;

      // Fade phantom out smoothly instead of instant remove
      phantom.style.transition = 'opacity 0.18s ease-out';
      phantom.style.opacity = '0';
      await new Promise(r => setTimeout(r, 200));

      if (phantom.parentNode) phantom.remove();                  // ← FIX 2 END

      modal.style.transform = 'none';
      modalWrap.style.overflowY = 'auto';

      /* — Step 5: Stagger content — */
      content.forEach((c, i) => {
        setTimeout(() => {
          c.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
          c.style.opacity = '1';
          c.style.transform = 'translateY(0)';
        }, 100 + i * 180);
      });

      if (indication) {
        setTimeout(() => {
          indication.forEach(ind => {
            ind.style.transition = 'opacity 0.6s ease';
            ind.style.opacity = '1';
          });
        }, 350);
      }

      const updateOverlayHeight = () => {
        const h = Math.max(modal.offsetHeight + window.innerHeight * 0.1, window.innerHeight);
        overlay.style.position = 'absolute';
        overlay.style.height = h + 'px';
      };
      updateOverlayHeight();
      const resizeObs = new ResizeObserver(updateOverlayHeight);
      resizeObs.observe(modal);

      /* ─── Close ─── */
      let closing = false;

      const closeModal = async () => {
        if (closing) return;
        closing = true;
        resizeObs.disconnect();

        try {                                                    // ← FIX 3 START

          modalWrap.scrollTo({ top: 0, behavior: 'smooth' });
          await new Promise(r => setTimeout(r, 380));

          content.forEach(c => {
            c.style.transition = 'opacity 0.3s ease, transform 0.35s ease';
            c.style.opacity = '0';
            c.style.transform = 'translateY(1rem)';
          });
          if (indication) indication.forEach(ind => {
            ind.style.transition = 'opacity 0.25s ease';
            ind.style.opacity = '0';
          });
          if (display) {
            display.style.transition = 'background-color 0.35s ease';
            display.style.backgroundColor = '#ededed';
          }

          await new Promise(r => setTimeout(r, 320));

          modalWrap.style.overflowY = 'hidden';
          overlay.style.position = 'fixed';
          overlay.style.height = '100vh';

          const currentH = modal.offsetHeight;
          modal.style.height = currentH + 'px';
          modal.offsetHeight;

          if (_material) animateBackdrop(1, 0, 700);             // ← FIX 1

          await animateValue(0, 1, 500, cubicInOut, (p) => {
            const scale = 1 - p * 0.08;
            const translateY = p * 20;
            modal.style.transform = `scale(${scale}) translateY(${translateY}px)`;
            modal.style.opacity = String(1 - p);
            modal.style.borderRadius = (16 + p * 4) + 'px';
            const s = (1 - p) * 60;
            modal.style.boxShadow = `0 ${s * 0.4}px ${s}px rgba(12, 0, 46, ${(1 - p) * 0.35})`;
          });

          overlay.style.transition = 'opacity 0.45s ease';
          overlay.style.opacity = '0';

          await new Promise(r => setTimeout(r, 450));

        } finally {                                              // ← FIX 3
          // Always runs even if an animation step throws
          element.style.transition = 'opacity 0.5s ease';
          element.style.opacity = originalOpacity || '1';

          if (_raf) stopBackdropLoop();                          // ← FIX 1
          if (_canvas) hideCanvas();                             // ← FIX 1

          document.body.style.overflow = '';
          if (window.lenis) window.lenis.start();
          if (modalWrap.parentNode) document.body.removeChild(modalWrap);
        }                                                        // ← FIX 3 END
      };

      overlay.addEventListener('click', closeModal);
      if (indication) indication.forEach(ind => ind.addEventListener('click', closeModal));
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      document.addEventListener('keydown', function esc(ev) {
        if (ev.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
      });
    });
  });
};

    // ── Work item image hover (inline) ──
    document.querySelectorAll('.work_items-wrapper .work-item').forEach((item) => {
      const img = item.querySelector('.work_image-wrapper');
      if (!img) return;

      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.display = 'flex';
      img.style.alignItems = 'center';
      img.style.justifyContent = 'center';
      img.style.opacity = '0';
      img.style.pointerEvents = 'none';
      img.style.zIndex = '0';
      img.style.transition = 'opacity 0.4s ease';

      item.style.position = 'relative';
      item.style.overflow = 'hidden';

      const imgEl = img.querySelector('.work-image');
      if (imgEl) {
        imgEl.style.width = 'auto';
        imgEl.style.height = '65%';
        imgEl.style.maxHeight = '9rem';
        imgEl.style.objectFit = 'contain';
        imgEl.style.opacity = '0.18';
        imgEl.style.transform = 'scale(0.88)';
        imgEl.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      item.addEventListener('mouseenter', () => {
        img.style.opacity = '1';
        if (imgEl) imgEl.style.transform = 'scale(1)';
      });

      item.addEventListener('mouseleave', () => {
        img.style.opacity = '0';
        if (imgEl) imgEl.style.transform = 'scale(0.88)';
      });
    });

    // ── Footer text reveal ──
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const targets = entry.target.querySelectorAll('.hide-mobile-landscape, .text-block-2, .show-mobile-landscape');
          targets.forEach((el, i) => {
            setTimeout(() => {
              el.style.transition = 'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)';
              el.style.opacity = '1';
              el.style.transform = 'translate3d(0, 0%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)';
            }, i * 150);
          });
          footerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.footer_copywrite-content').forEach((el) => footerObserver.observe(el));

    const initMobileNav = () => {
      const hamburger = document.querySelector('.nav-hamburger');
      const menuWrapper = document.querySelector('.nav_menu-layout-wrapper');
      if (!hamburger || !menuWrapper) return;

      menuWrapper.removeAttribute('style');
      menuWrapper.style.display = 'none';

      const navLayout = menuWrapper.querySelector('.nav_menu-layout');
      if (navLayout) navLayout.removeAttribute('style');

      menuWrapper.querySelectorAll('.nav-link').forEach((link) => {
        link.removeAttribute('style');
      });

      const backdrop = menuWrapper.querySelector('.nav-menu_backdrop');
      if (backdrop) backdrop.style.display = 'none';

      const navBtn = document.querySelector('.nav_buttons-wrapper .button-base');
      if (navBtn) {
        const textWrap = navBtn.querySelector('.button-base_text_wrap');
        if (textWrap) {
          textWrap.style.position = 'relative';
        }
      }

      let isOpen = false;

      hamburger.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
        isOpen = !isOpen;

        hamburger.classList.toggle('is-open', isOpen);

        if (isOpen) {
          menuWrapper.style.display = 'flex';
          requestAnimationFrame(() => menuWrapper.classList.add('menu--open'));
          document.body.style.overflow = 'hidden';
          if (window.lenis) window.lenis.stop();

          menuWrapper.querySelectorAll('.nav-link').forEach((link, i) => {
            link.style.opacity = '0';
            setTimeout(() => {
              link.style.transition = 'opacity 0.3s ease';
              link.style.opacity = '1';
            }, 100 + i * 50);
          });
        } else {
          menuWrapper.classList.remove('menu--open');
          menuWrapper.querySelectorAll('.nav-link').forEach((link) => {
            link.style.opacity = '0';
          });
          setTimeout(() => {
            menuWrapper.style.display = 'none';
            document.body.style.overflow = '';
            if (window.lenis) window.lenis.start();
          }, 300);
        }
      }, true);

      menuWrapper.querySelectorAll('.nav-link').forEach((link) =>
        link.addEventListener('click', () => {
          if (isOpen) hamburger.click();
        })
      );

      document.addEventListener('click', (e) => {
        if (isOpen && !menuWrapper.contains(e.target) && !hamburger.contains(e.target)) {
          hamburger.click();
        }
      });
    };

    // ── Elfsight: lazy-load when social section is near viewport ──
const initElfsight = () => {
  if (document.querySelector('script[src*="elfsight"]')) return;
  const script = document.createElement('script');
  script.src = 'https://static.elfsight.com/platform/platform.js';
  script.async = true;
  document.body.appendChild(script);
};
    // ── Reinit Webflow ──
    const reinitWebflow = () => {
      if (window.Webflow && window.Webflow.destroy) {
        window.Webflow.destroy();
        window.Webflow.ready();
        window.Webflow.require('ix2')?.init();
        document.dispatchEvent(new Event('readystatechange'));
      }
    };

// ── Boot sequence: staggered by priority ──
reinitWebflow();

// Critical path — run immediately
initLenis();
initSmartNav();
initHeroAnimation();
initElfsight();
// Above-fold, can wait one frame
requestAnimationFrame(() => {
  initHeroParallax();
  initScrollAnimations();
  initPartnersReveal();
  initSectionReveals();
  initFAQ();
});

// Below-fold — defer until idle
deferInit(() => {
  initWorkAnimations();
  initWorkHover();
  initTestimonialReveal();
  initArticlesSocialReveal();
});

// 3D Spheres — lazy load when services section is near
deferInit(() => {
  const sphereTarget = document.getElementById('spheres-canvas');
  if (sphereTarget) {
    const sphereObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        initSpheres();
        sphereObserver.disconnect();
      });
    }, { rootMargin: '400px' });
    sphereObserver.observe(sphereTarget);
  }
});

// Heavy / external — defer (SINGLE call, not duplicated)
deferInit(() => {
  initModals();
  initMobileNav();
});

  }, []);

  // ── Arrow SVG ──
  const arrowSvg = (
    <svg viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.77734 8.5L13.3329 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      <path d="M9.11133 3.83203L13.778 8.4987L9.11133 13.1654" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );

  const closeSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 32 32" fill="none">
      <g clipPath="url(#clip0_3_9822)">
        <path d="M17.4141 16L24 9.4141L22.5859 8L16 14.5859L9.4143 8L8 9.4141L14.5859 16L8 22.5859L9.4143 24L16 17.4141L22.5859 24L24 22.5859L17.4141 16Z" fill="white" />
      </g>
      <defs>
        <clipPath id="clip0_3_9822">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );

  const linkedinSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );

  const githubSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>GitHub icon</title>
      <path d="M12,2.2467A10.00042,10.00042,0,0,0,8.83752,21.73419c.5.08752.6875-.21247.6875-.475,0-.23749-.01251-1.025-.01251-1.86249C7,19.85919,6.35,18.78423,6.15,18.22173A3.636,3.636,0,0,0,5.125,16.8092c-.35-.1875-.85-.65-.01251-.66248A2.00117,2.00117,0,0,1,6.65,17.17169a2.13742,2.13742,0,0,0,2.91248.825A2.10376,2.10376,0,0,1,10.2,16.65923c-2.225-.25-4.55-1.11254-4.55-4.9375a3.89187,3.89187,0,0,1,1.025-2.6875,3.59373,3.59373,0,0,1,.1-2.65s.83747-.26251,2.75,1.025a9.42747,9.42747,0,0,1,5,0c1.91248-1.3,2.75-1.025,2.75-1.025a3.59323,3.59323,0,0,1,.1,2.65,3.869,3.869,0,0,1,1.025,2.6875c0,3.83747-2.33752,4.6875-4.5625,4.9375a2.36814,2.36814,0,0,1,.675,1.85c0,1.33752-.01251,2.41248-.01251,2.75,0,.26251.1875.575.6875.475A10.0053,10.0053,0,0,0,12,2.2467Z" />
    </svg>
  );

  const mediumSvg = (
    <svg aria-hidden="true" role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Medium icon</title>
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.11-.53 5.62-1.18 5.62-.66 0-1.18-2.51-1.18-5.62s.52-5.62 1.18-5.62c.65 0 1.18 2.51 1.18 5.62z" />
    </svg>
  );

  const logoSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 62 33" fill="none" className="svg">
      <path d="M15.5309 4.98386C14.977 3.93989 14.1229 3.08584 13.0789 2.53187C11.9364 1.92027 10.6567 1.61049 9.36093 1.63187C7.62423 1.60033 5.91506 2.06858 4.43693 2.98086C3.00696 3.87926 1.86504 5.16939 1.14692 6.69787C0.366136 8.35873 -0.0254702 10.1758 0.00191778 12.0109C-0.0303673 13.8477 0.345335 15.6688 1.10192 17.3429C1.79306 18.8591 2.90692 20.1438 4.30992 21.0429C5.79829 21.9655 7.52331 22.4343 9.27392 22.3919C10.5781 22.4072 11.8647 22.0906 13.0129 21.4719C14.0638 20.935 14.9366 20.1052 15.5259 19.0829V21.8619H21.7369V2.16186H15.5239L15.5309 4.98386ZM14.5499 15.7319C14.1226 16.2269 13.5871 16.6171 12.9849 16.8721C12.3826 17.1272 11.7299 17.2404 11.0769 17.2029C10.4363 17.2282 9.79807 17.1112 9.20809 16.8603C8.61812 16.6094 8.09109 16.2308 7.66493 15.7519C6.78114 14.7121 6.32191 13.3773 6.37892 12.0139C6.31996 10.6559 6.77972 9.32635 7.66493 8.29487C8.09454 7.82158 8.6227 7.44826 9.21221 7.20119C9.80173 6.95412 10.4382 6.83931 11.0769 6.86487C11.73 6.82734 12.3828 6.94058 12.9851 7.19584C13.5873 7.45109 14.1228 7.84151 14.5499 8.33687C15.3879 9.37537 15.8232 10.6813 15.7759 12.0149C15.8276 13.361 15.3924 14.6807 14.5499 15.7319Z" fill="currentColor" />
      <path d="M42.0361 1.84085H37.5951C36.3129 1.83665 35.0692 2.27885 34.0775 3.09157C33.0858 3.90428 32.4079 5.03683 32.1601 6.29485V2.16785H25.9141V21.8679H32.1651V14.2679C32.0408 12.527 32.5011 10.7945 33.4731 9.34485C33.9438 8.78245 34.5409 8.33935 35.2155 8.05173C35.8902 7.7641 36.6233 7.6401 37.3551 7.68985C37.5371 7.68985 37.749 7.70085 37.955 7.71085L37.9651 7.67685C38.2118 6.87993 38.5371 6.10948 38.9361 5.37685C39.7114 3.99485 40.7674 2.79038 42.0361 1.84085Z" fill="currentColor" />
      <path d="M45.0374 21.0679C46.8431 21.942 48.8233 22.3961 50.8294 22.3961C52.8356 22.3961 54.8157 21.942 56.6214 21.0679C58.2212 20.2307 59.5419 18.9448 60.4214 17.3679C61.2927 15.7192 61.7481 13.8826 61.7481 12.0179C61.7481 10.1531 61.2927 8.31657 60.4214 6.66788C60.1394 6.17669 59.8134 5.71211 59.4474 5.27988H61.7474V0.00488281L59.0074 1.32888L56.1004 2.72888C54.3473 1.97226 52.4518 1.60198 50.5428 1.64322C48.6339 1.68446 46.7562 2.13625 45.0374 2.96788C43.4302 3.80189 42.1023 5.08811 41.2174 6.66788C40.3461 8.31657 39.8906 10.1531 39.8906 12.0179C39.8906 13.8826 40.3461 15.7192 41.2174 17.3679C42.1012 18.9485 43.4294 20.235 45.0374 21.0679ZM47.3854 8.31288C48.3033 7.40921 49.5398 6.90272 50.8279 6.90272C52.116 6.90272 53.3525 7.40921 54.2704 8.31288C55.0925 9.37107 55.5387 10.6729 55.5387 12.0129C55.5387 13.3529 55.0925 14.6547 54.2704 15.7129C53.3525 16.6166 52.116 17.1231 50.8279 17.1231C49.5398 17.1231 48.3033 16.6166 47.3854 15.7129C46.5742 14.6491 46.1348 13.3482 46.1348 12.0104C46.1348 10.6725 46.5742 9.37172 47.3854 8.30788V8.31288Z" fill="currentColor" />
      <path d="M55.1508 24.4308C54.9683 25.0276 54.6653 25.5806 54.2607 26.0558C53.3428 26.9595 52.1064 27.4659 50.8183 27.4659C49.5302 27.4659 48.2937 26.9595 47.3758 26.0558C46.9621 25.5642 46.6556 24.9916 46.4758 24.3748C46.4218 24.2088 46.3468 24.0588 46.3068 23.8838H39.9688C40.125 25.2278 40.5436 26.528 41.2007 27.7108C42.0848 29.2912 43.4129 30.5776 45.0208 31.4108C46.8266 32.2844 48.8067 32.7382 50.8127 32.7382C52.8188 32.7382 54.7989 32.2844 56.6048 31.4108C58.2045 30.5736 59.5252 29.2877 60.4048 27.7108C61.0619 26.528 61.4805 25.2278 61.6367 23.8838H55.3368C55.2847 24.0693 55.2226 24.2519 55.1508 24.4308Z" fill="url(#paint0_linear_406_1158)" />
      <defs>
        <linearGradient id="paint0_linear_406_1158" x1="39.9688" y1="28.311" x2="61.6367" y2="28.311" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0060D" />
          <stop offset="0.494" stopColor="#C924D7" />
          <stop offset="1" stopColor="#7904FD" />
        </linearGradient>
      </defs>
    </svg>
  );

  const ProjectItem = ({ imgSrc, mockupSrc, mockupSrcSet, imgSrcSet, title, subtitle, problem, solutionBold, solution, liveLink, logos, stack }) => (
    <div id="w-node-9ae66378-7dfe-90c5-38a0-a96f7867d76c-3c83288f" data-w-id="9ae66378-7dfe-90c5-38a0-a96f7867d76c" role="listitem" className="projects_item_wrap w-dyn-item">
      <div className="projects_item">
        <div className="projects_modal-close_btn">
          <div className="projects_modal-close_wrap">{closeSvg}</div>
        </div>
        <div className="projects_item_display">
          <div className="projects_modal_indication is-mobile">
            <div className="projects_modal_text">Tap</div>
            <div className="projects_modal_text-wrap"><div className="projects_modal_text">Here</div></div>
            <div className="projects_modal_text">to close</div>
          </div>
          <div className="projects_item_visual">
<img src={imgSrc} loading="lazy" data-wf-drag="false" alt="" className="projects_visual_img" width="1200" height="800" />
          </div>
        </div>
        <div className="projects_item_content">
          <div className="projects_item_tag"><div className="test_tag_text">Problem</div></div>
          <div className="padding-bottom padding-30"></div>
          <p className="test_item_paragraph text-align-center">{problem}</p>
          <div className="padding-bottom padding-42"></div>
          <a href={liveLink} className="test_item_link">View Live Site ↗</a>
          <div className="padding-bottom padding-42"></div>
          <div className="projects_item_visual is-showcase">
<img loading="lazy" src={mockupSrc} alt="" sizes="(max-width: 479px) 100vw, (max-width: 767px) 275.995361328125px, (max-width: 991px) 36vw, 18vw" srcSet={mockupSrcSet} className="projects_item_sec-img" width="400" height="800" />
          </div>
        </div>
        <div className="projects_item_content is-padding-bottom is-white-bg">
          <div className="projects_item_tag"><div className="test_tag_text">Solution</div></div>
          <div className="padding-bottom padding-30"></div>
          <p className="test_item_paragraph text-align-center is-bold">{solutionBold}</p>
          <p className="test_item_paragraph text-align-center">{solution}</p>
          <div className="padding-bottom padding-30"></div>
          <div className="projects_item_logo-wrap w-dyn-list">
            <div role="list" className="projects_item_list w-dyn-items">
              {logos.map((logo, i) => (
                <div key={i} role="listitem" className="projects_list_logo w-dyn-item w-dyn-repeater-item">
<img loading="lazy" src={logo} alt="" className="projects_logo_image" width="80" height="40" />
                </div>
              ))}
            </div>
          </div>
          <div className="padding-bottom padding-42"></div>
          <div className="projects_item_stack">
            <div className="projects_stack_text is-medium">Tech Stack:</div>
            <div className="projects_stack_text">{stack}</div>
          </div>
        </div>
        <div className="projects_item_cover-img">
<img data-wf-drag="false" loading="lazy" alt="" src={imgSrc} sizes="(max-width: 767px) 91vw, (max-width: 991px) 88vw, 24vw" srcSet={imgSrcSet} className="projects_visual_img is-thumbnail" width="1200" height="800" />
        </div>
      </div>
      <div className="projects_item_description">
        <a aria-label={title} href="#" className="text-button w-inline-block">
          <div className="text-button_list is-dark">
            <h3 className="heading-style-h3">{title}</h3>
            <div className="arrow_icon-embed large w-embed">{arrowSvg}</div>
          </div>
          <div className="text-button_list is-animated is-dark">
            <h3 className="heading-style-h3">{title}</h3>
            <div className="arrow_icon-embed large w-embed">{arrowSvg}</div>
          </div>
        </a>
        <div className="subtitle-projects">{subtitle}</div>
      </div>
    </div>
  );

  const faqItems = [
    {
      q: 'How much does custom software development cost?',
      a: <><p>The cost depends entirely on scope, complexity, integrations, and scalability requirements. An MVP with a focused feature set is very different from a multi-role platform with complex workflows and third-party integrations.</p><p>Instead of fixed pricing, we provide:</p><ul><li>A structured discovery phase</li><li>Technical breakdown of features</li><li>Architecture recommendations</li><li>A realistic timeline and budget range</li></ul><p>This ensures clarity and prevents scope surprises later.</p></>
    },
    {
      q: 'How long does it take to build an MVP?',
      a: <><p>Most MVPs are delivered within 8–14 weeks, depending on:</p><ul><li>Feature complexity</li><li>UX/UI depth</li><li>Integrations (payments, APIs, compliance, etc.)</li><li>Performance or security constraints</li></ul><p>We work in short development cycles so you can validate quickly and iterate based on real user feedback.</p></>
    },
    {
      q: 'Do you work with clients outside the USA and Europe?',
      a: <><p>Yes. We collaborate with companies in North America, South America, Europe, and globally. Our process is built for remote execution with:</p><ul><li>Structured sprint reviews</li><li>Clear documentation</li><li>Transparent progress tracking</li><li>Reliable time zone overlap</li></ul><p>Location is never a limitation — communication and process matter more.</p></>
    },
    {
      q: 'Do you work with startups or established companies?',
      a: <><p>Both. We support:</p><ul><li>Startups building and validating MVPs</li><li>SMEs modernizing systems</li><li>Scaling companies optimizing performance</li><li>Enterprises building custom internal platforms</li></ul><p>Engagement models are tailored to your growth stage.</p></>
    },
    {
      q: 'What technologies do you use?',
      a: <><p>We select technology based on long-term maintainability and scalability, not trends. Common stacks include:</p><ul><li>Web: React, Next.js, TypeScript</li><li>Backend: Node.js, .NET, Java</li><li>Cloud: AWS, Azure, GCP</li><li>Mobile: React Native, Flutter</li><li>Databases: PostgreSQL, MongoDB</li></ul><p>Architecture decisions are driven by business goals.</p></>
    },
    {
      q: 'How do you ensure scalability and code quality?',
      a: <><p>We apply engineering best practices:</p><ul><li>Clean architecture principles</li><li>Automated testing</li><li>Code reviews</li><li>CI/CD pipelines</li><li>Infrastructure as Code</li><li>Security-first design</li></ul><p>We build software meant to evolve — not to be rewritten after year one.</p></>
    },
    {
      q: 'Can you scale our product after launch?',
      a: <><p>Yes. We frequently support clients post-launch with:</p><ul><li>Performance optimization</li><li>Cloud cost optimization</li><li>Feature expansion</li><li>Dedicated team extension</li></ul><p>Our goal is long-term partnership, not one-off delivery.</p></>
    },
    {
      q: 'Do you provide dedicated development teams?',
      a: <><p>Yes. You can work with:</p><ul><li>A cross-functional product team</li><li>Dedicated engineers embedded into your internal team</li></ul><p>We adapt to your preferred collaboration model.</p></>
    },
    {
      q: 'What is your development process?',
      a: <><p>Our structured process includes:</p><ul><li>Discovery &amp; technical planning</li><li>Architecture design</li><li>Agile sprint-based development</li><li>Continuous QA &amp; testing</li><li>Launch &amp; support</li></ul><p>You maintain full visibility and control throughout the lifecycle.</p></>
    },
    {
      q: 'How do we get started?',
      a: <><p>We begin with a strategy call to understand:</p><ul><li>Your business goals</li><li>Technical constraints</li><li>Growth plans</li><li>Timeline expectations</li></ul><p>From there, we provide a clear roadmap and proposal. No guesswork. No inflated promises.</p></>
    },
  ];

  return (
    <>
      
      <div className="page-wrapper w-clearfix">

        {/* ══════════════════════ NAV ══════════════════════ */}
        <div
                  className="nav_wrap padding-global w-nav"
                  data-animation="default"
                  data-easing2="ease-in"
                  data-easing="ease-in"
                  data-collapse="all"
                  role="banner"
                  data-no-scroll="1"
                  data-duration="400"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    background: 'transparent',
                    paddingTop: '2.875rem',
                    zIndex: 10,
                  }}
                >
                  <div className="nav_contain container">
                    <div style={{ opacity: 1 }} className="nav-component">
                      {/* Internal: logo -> home */}
                      <TransitionLink
                        to="/"
                        aria-label="Arg Software"
                        className="nav_logo-wrapper w-nav-brand"
                      >
                        <div className="nav_logo_icon">{logoSvg}</div>
                      </TransitionLink>
        
                    
        
                      <div className="nav_buttons-wrapper">
                        {/* External -> keep <a> */}
                        <a
                          href="https://zcal.co/argsoftware/project"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button-base w-inline-block"
                        >
                          <div className="button-base_text_wrap">
                            <div className="button-base__button-text">Book a Meeting </div>
                            <div className="button-base__button-text is-animated">No commitment</div>
                          </div>
                        </a>
                        <div className="nav-hamburger w-nav-button">
                          <div className="menu-icon z-index-2">
                            <div className="menu_icon-line is--top"></div>
                            <div className="menu_icon-line is--bottom"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'none' }} className="nav_menu-layout-wrapper">
                        <div className="nav_menu-layout">
                          {/* Internal anchors -> TransitionLink */}
                            <TransitionLink to="/#about" className="nav-link w-nav-link">
                                About
                            </TransitionLink>
                            <TransitionLink to="/#services" className="nav-link w-nav-link">
                                Services
                            </TransitionLink>
                            <TransitionLink to="/#cases" className="nav-link w-nav-link">
                                Our Work
                            </TransitionLink>
                            <TransitionLink to="/#testimonials" className="nav-link w-nav-link">
                                Testimonials
                            </TransitionLink>
                            <TransitionLink to="/#work-with-us" className="nav-link w-nav-link">
                                Working with Us
                            </TransitionLink>
                            <TransitionLink to="/team" className="nav-link w-nav-link">
                                Team
                            </TransitionLink>
                            <TransitionLink to="/partners" className="nav-link w-nav-link">
                                Partners
                            </TransitionLink>
                            <TransitionLink to="/articles" className="nav-link w-nav-link">
                                Articles
                            </TransitionLink>
                            <TransitionLink to="/#social" className="nav-link w-nav-link">
                                Social
                            </TransitionLink>
                            <TransitionLink to="/#contact" className="nav-link is--last w-nav-link">
                                Contact
                            </TransitionLink>
                        </div>
                        <div style={{ height: '0%' }} className="nav-menu_backdrop"></div>
                      </div>
                </div>

        {/* ══════════════════════ MAIN ══════════════════════ */}
        <main className="main-wrapper">

          {/* ── HERO ── */}
          <header data-w-id="03b45077-cd1d-c5f8-448b-54b3be3b8dac" className="hero_wrap">
            <div className="hero_contain container padding-global">
              <div className="hero_list">
                <h1 className="hero_heading heading-style-h1">
                  <div className="heading_line">
                    <div style={{ transform: 'translate3d(0, 400%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(20deg) skew(0, 0)' }} className="heading_text">Building digital solutions</div>
                  </div>
                  <div className="heading_line">
                    <div style={{ transform: 'translate3d(0, 200%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(10deg) skew(0, 0)' }} className="text-color-gradiant">that grow with you</div>
                  </div>
                </h1>
              </div>
              <div className="hero_bottom_wrap">
                <div data-w-id="2e342a7e-467f-011c-2fd9-6d344b25d7f9" style={{ opacity: 0, transform: 'translate3d(0, 0, 0) scale3d(0.1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="line-separate is--hero"></div>
                <div className="hero_bottom_list">
                  <div id="w-node-e4d45fe8-457d-0989-3af8-771c2914a3d2-3c83288f" className="hero_bottom_info">
                    <div className="hero_bottom_content">
                      <p data-w-id="3a77596f-692e-0850-209d-f23fa68c2ed0" style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="hero_bottom_paragraph">Your partner in creating scalable, reliable solutions</p>
                    </div>
                  </div>
                  <div id="w-node-911b5ac4-3228-dc3e-eb19-0df97a0cfd35-3c83288f" className="hero_bottom_content">
                    <a href="mailto:hello@arg.software?subject=I%20want%20to%20share%20my%20ideas" className="text-button w-inline-block">
                      <div style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="text-button_list">
                        <div className="text-button_text">Share my ideas</div>
                        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                      </div>
                      <div className="text-button_list is-animated">
                        <div className="text-button_text">Write us</div>
                        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                      </div>
                    </a>
                  </div>
                  <div id="w-node-fb057b2e-7e65-d7d1-92f8-e6d4aec40d91-3c83288f" className="bottom_buttons-wrapper">
                    <div className="overflow-hidden">
                      <a href="#contact" className="text-button w-inline-block">
                        <div style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="text-button_list">
                          <div className="text-button_text">I want a new software</div>
                          <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                        </div>
                        <div className="text-button_list is-animated">
                          <div className="text-button_text">We are here to help</div>
                          <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="padding-global"></div>
            </div>
            <div className="hero_visual">
              <div data-poster-url="images/metaball-loop-1-poster-00001.jpg" data-video-urls="images/metaball-loop-1-transcode.mp4,images/metaball-loop-1-transcode.webm" data-autoplay="true" data-loop="true" data-wf-ignore="true" className="hero_bg-video w-background-video w-background-video-atom">
                <video id="hero-video" autoPlay loop muted playsInline style={{ backgroundImage: 'url("images/metaball-loop-1-poster-00001.jpg")' }} data-wf-ignore="true" data-object-fit="cover">
                  <source src="images/hero-video-opt.mp4" data-wf-ignore="true" />

                </video>
              </div>
            </div>
          </header>

{/* ── PARTNERS ── */}
<section className="partners_wrap background-color-white">
  <div className="partners_marquee-outer">
    <div className="partners_marquee-track">
      {[0, 1, 2, 3].map((setIndex) => (
        <div key={setIndex} className="partners_marquee-set">
          <div className="partners_logo_wrap"><img src="images/group-203127-402x.png" loading="lazy" alt="Three Sigma" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap is-small"><img src="images/group-203134-402x.png" loading="lazy" alt="Hostelier" className="partners_logo" width="100" height="120" /></div>
          <div className="partners_logo_wrap is-m-100"><img src="images/group-203128-402x.png" loading="lazy" alt="Mb-Netzwerk" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/group-203133-402x.png" loading="lazy" alt="SEFA" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/av-20logo-20medium-402x.png" loading="lazy" alt="Angry Ventures" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/group-123132-402x.svg" loading="lazy" alt="Partner" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/group-203112.svg" loading="lazy" alt="Partner" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/group-203159-402x.png" loading="lazy" alt="Sky Tracks" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/group-203132-402x.png" loading="lazy" alt="North Music Group" className="partners_logo" width="200" height="120" /></div>
          <div className="partners_logo_wrap"><img src="images/mojaloop-foundation-orange-402x.png" loading="lazy" alt="Mojaloop" className="partners_logo" width="200" height="120" /></div>
        </div>
      ))}
    </div>
  </div>
  <div className="partners_contain container padding-global" style={{ paddingTop: '2rem', paddingBottom: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
    <TransitionLink to="/partners" className="text-button w-inline-block">
      <div className="text-button_list is-dark">
        <div className="text-button_text">See all partners</div>
        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
      </div>
      <div className="text-button_list is-animated is-dark">
        <div className="text-button_text">Meet them</div>
        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
      </div>
    </TransitionLink>
  </div>
  <div className="line-separate is--partners"></div>
</section>

          {/* ── ABOUT ── */}
          <section id="about" className="about_wrap background-color-white">
            <div className="about_contain container padding-global">
              <div data-w-id="a0f95455-6fe8-8145-bc71-63831cee596b" style={{ opacity: 0 }} className="about_list">
                <h2 id="w-node-422b94ec-0af3-941e-ce29-6c95ed8ce99d-3c83288f" className="about_heading">
                  <div className="heading_line"><div className="heading-style-h2">Custom software, <br />endless potential</div></div>
                </h2>
                <div id="w-node-6519aa5b-2175-0878-f585-d80467e0103d-3c83288f" className="about_content">
                  <p className="about_paragraph">At ARG, we don't just build digital products — we see them through your eyes. Your business will stand out with a tailored approach, even in such a high-competing market. Boost your business through impactful, ready-to-launch digital products designed to fit users' demands on any device.</p>
                  <a href="#contact" className="text-button w-inline-block">
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Help me with my product</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Start a project</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ── INFINITY MARQUEE ── */}
          <div className="section_infinity background-color-gray overflow-hidden">
            <div className="infinity_list"><p className="infinity_text"> Custom Software • SaaS Development • Server Infrastructure • Prototyping • AI • MVP • Backend Development • Frontend Development • </p></div>
            <div className="infinity_list"><p className="infinity_text"> Custom Software • SaaS Development • Server Infrastructure • Prototyping • AI • MVP • Backend Development • Frontend Development • </p></div>
          </div>

          {/* ── SERVICES ── */}
          <section id="services" className="services_wrap background-color-white">
            <div data-w-id="4b86f7b5-ae15-1676-1aed-ebbda2595e67" className="services_contain container padding-global">
              <div data-w-id="7e1275c0-0413-7e2e-cf96-8588980a5d8e" className="services_grid">
<div id="w-node-14c5d45d-4f62-dea2-0ec7-7eec0eb52ee8-3c83288f" className="services_illustration">
  <div className="services-sticky_spline-embed">
    <canvas id="spheres-canvas"></canvas>
  </div>
</div>
                <div id="w-node-3e3c3279-17f8-0288-19fd-af17de4fec77-3c83288f" className="services_list">
                  <div className="services_item">
                    <div id="w-node-b58176c9-9f4a-fcfd-df2b-55a480cd9c98-3c83288f" className="services_item_number"><div className="service_number_text">01</div></div>
                    <div id="w-node-b58176c9-9f4a-fcfd-df2b-55a480cd9c9b-3c83288f" className="services_item_heading"><h3 className="services_heading_text">Product Discovery + Prototyping</h3></div>
                    <div id="w-node-471cf602-f887-c0e4-7b1e-3d4b0f89dfb2-3c83288f" className="services_item_content">
                      <div className="services_item_tag"><div className="services-tag"><div className="text-size-tiny">Product Design</div></div><div className="services-tag"><div className="text-size-tiny">Prototyping</div></div></div>
                      <p className="services_item_paragraph">You have to love it, but the truth is: we're thinking about your customer from day one. We study your ideas before transforming them into actionable plans, by analyzing your business needs, market trends, and customer demands. Only then do you get an in-depth roadmap to create your digital product. Let's build one that doesn't just enter the market but leads it.</p>
                    </div>
                  </div>
                  <div className="services_item">
                    <div id="w-node-c36c3e11-63f8-12db-024f-20609086bc0d-3c83288f" className="services_item_number"><div className="service_number_text">02</div></div>
                    <div id="w-node-c36c3e11-63f8-12db-024f-20609086bc10-3c83288f" className="services_item_heading"><h3 className="services_heading_text">MVP Launch</h3></div>
                    <div id="w-node-c36c3e11-63f8-12db-024f-20609086bc13-3c83288f" className="services_item_content">
                      <div className="services_item_tag"><div className="services-tag"><div className="text-size-tiny">Minimum Viable Product</div></div><div className="services-tag"><div className="text-size-tiny">Launch</div></div><div className="services-tag"><div className="text-size-tiny">AI</div></div></div>
                      <p className="services_item_paragraph">You guessed it right: the proper strategy can take you places. Launch your MVP flawlessly with a streamlined approach. We combine human expertise with AI-powered insights to refine your concept, validate assumptions, and prioritize what really matters.<br />Get expert advice from concept to market launch, focusing on your MVP's prime features. This fast, data-driven strategy works wonders in today's fast-paced business world. So, rest assured, your (minimum) effort will land optimal results.</p>
                    </div>
                  </div>
                  <div className="services_item">
                    <div id="w-node-c8bdb4d8-59c6-96f0-a783-3cca03d97891-3c83288f" className="services_item_number"><div className="service_number_text">03</div></div>
                    <div id="w-node-c8bdb4d8-59c6-96f0-a783-3cca03d97894-3c83288f" className="services_item_heading"><h3 className="services_heading_text">Frontend Development</h3></div>
                    <div id="w-node-c8bdb4d8-59c6-96f0-a783-3cca03d97897-3c83288f" className="services_item_content">
                      <div className="services_item_tag"><div className="services-tag"><div className="text-size-tiny">Maintainable</div></div><div className="services-tag"><div className="text-size-tiny">Scalable</div></div></div>
                      <p className="services_item_paragraph">Build a website or app that adjusts, adapts, and delivers clear messages. You can only get this by creating a smooth experience across all devices — for everyone. Function and appeal have never looked so good.</p>
                    </div>
                  </div>
                  <div className="services_item">
                    <div id="w-node-f442f592-5d56-0c24-e3b9-2bc1c0cedcc8-3c83288f" className="services_item_number"><div className="service_number_text">04</div></div>
                    <div id="w-node-f442f592-5d56-0c24-e3b9-2bc1c0cedccb-3c83288f" className="services_item_heading"><h3 className="services_heading_text">Backend Development</h3></div>
                    <div id="w-node-f442f592-5d56-0c24-e3b9-2bc1c0cedcce-3c83288f" className="services_item_content">
                      <div className="services_item_tag"><div className="services-tag"><div className="text-size-tiny">Efficient</div></div><div className="services-tag"><div className="text-size-tiny">Scalable</div></div></div>
                      <p className="services_item_paragraph">The behind-the-scenes nobody sees is where everything starts. Build your website or app from the basics: databases, servers, and accounts. We handle what users don't see, assuring everything runs smoothly whenever they land on your (brand-new) digital product. Bet on a solution that scales with your business.</p>
                    </div>
                  </div>
                  <div className="services_item">
                    <div id="w-node-3b63f12a-56b7-ab5f-26ef-3f94a0c137c7-3c83288f" className="services_item_number"><div className="service_number_text">05</div></div>
                    <div id="w-node-3b63f12a-56b7-ab5f-26ef-3f94a0c137ca-3c83288f" className="services_item_heading"><h3 className="services_heading_text">Server Infrastructure</h3></div>
                    <div id="w-node-3b63f12a-56b7-ab5f-26ef-3f94a0c137cd-3c83288f" className="services_item_content">
                      <div className="services_item_tag"><div className="services-tag"><div className="text-size-tiny">Cost control</div></div><div className="services-tag"><div className="text-size-tiny">Secure &amp; Fast</div></div></div>
                      <p className="services_item_paragraph">Keep your business away from flaws. Build a 24/7, cost-effective, resilient infrastructure. A custom solution built for speed, efficiency, and scalability — ensuring you're always online without breaking the bank. Get a dependable foundation that grows with you while assuring smart resource management.</p>
                    </div>
                  </div>
                  {/* ── Service 06: Automation (new in HTML version) ── */}
                  <div className="services_item">
                    <div id="w-node-3a4efde1-7939-c1ff-3cdc-374c9920b4b8-3c83288f" className="services_item_number"><div className="service_number_text">06</div></div>
                    <div id="w-node-3a4efde1-7939-c1ff-3cdc-374c9920b4bb-3c83288f" className="services_item_heading"><h3 className="services_heading_text">Automation</h3></div>
                    <div id="w-node-3a4efde1-7939-c1ff-3cdc-374c9920b4be-3c83288f" className="services_item_content">
                      <div className="services_item_tag"><div className="services-tag"><div className="text-size-tiny">Efficiency</div></div><div className="services-tag"><div className="text-size-tiny">AI</div></div></div>
                      <p className="services_item_paragraph">Efficiency isn't just a goal—it's a strategy. Streamline your operations with smart automation that removes friction and frees your team to focus on what truly matters. Combining proven workflows with AI-powered optimization, we help you cut manual effort, reduce errors, and move faster than ever.<br />From automating repetitive tasks to orchestrating complex processes, our approach ensures every system works in sync.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="line-separate is--partners"></div>
          </section>

          {/* ── PROJECTS ── */}
          <section id="cases" data-w-id="8e4ba5b9-2e4a-5f51-aae7-91657d6edc11" className="projects_wrap background-color-white">
            <div className="projects_contain container padding-global">
              <div className="projects_heading-wrapper">
                <h2 className="projects_heading heading-style-h2">They trusted us. It's your time now.</h2>
                <div className="subtitle_tag-wrapper"><div>Our Work</div></div>
              </div>
              <div className="projects_list_wrap w-dyn-list">
                <div role="list" className="projects_list w-dyn-items">
                  <ProjectItem title="Mojaloop" subtitle="Fintech" imgSrc="images/file.jpg" imgSrcSet="images/file-p-500.jpg 500w, images/file-p-800.jpg 800w, images/file-p-1080.jpg 1080w, images/file-p-1600.jpg 1600w, images/file-p-2000.jpg 2000w, images/file-p-2600.jpg 2600w, images/file-p-3200.jpg 3200w, images/file.jpg 6000w" mockupSrc="images/mojaloop-mobile-.png" mockupSrcSet="images/mojaloop-mobile-p-500.png 500w, images/mojaloop-mobile-p-800.png 800w, images/mojaloop-mobile-p-1080.png 1080w, images/mojaloop-mobile-p-1600.png 1600w, images/mojaloop-mobile-.png 2000w" liveLink="https://mojaloop.io/" problem="The implementation of Mojaloop's financial hub faced challenges at the intersection of technology, finance, and inclusivity. Ensuring seamless interoperability among diverse financial systems required overcoming technical hurdles like harmonizing protocols, maintaining data integrity, and handling high transaction volumes in unstable network conditions. Additionally, compliance with varied cultural, regulatory, and economic frameworks complicated the mission of fostering financial inclusion while maintaining stakeholder trust and credibility." solutionBold="ARG Software was invited to cooperate in a new version for the open-source solution that made digital payments easy and affordable for people and organizations worldwide." solution="Mojaloop's vNext implementation enhanced scalability, security, and modularity through an updated tech stack and microservices architecture to address these challenges. Real-time transaction settlement was implemented to reduce delays, and advanced security measures safeguarded sensitive data. Regulatory compliance tools were developed, and the user experience was improved with a more intuitive and accessible interface. Interoperability was expanded globally by fostering partnerships, while comprehensive resources enriched developer ecosystems. Educational efforts and a well-planned migration ensured a seamless transition, positioning Mojaloop as a powerful tool for inclusive financial transformation." logos={['images/group-203069.svg','images/group-203066.svg','images/path-20825.svg','images/group-203061.svg','images/group-203065.svg']} stack="Express, MongoDb, Kafka, Angular, Docker, Jest, Node" />
                  <ProjectItem title="Dokutar" subtitle="Digital Marketing" imgSrc="images/file-20-1-.jpg" imgSrcSet="images/file-20-1-p-500.jpg 500w, images/file-20-1-p-800.jpg 800w, images/file-20-1-p-1080.jpg 1080w, images/file-20-1-p-1600.jpg 1600w, images/file-20-1-p-2000.jpg 2000w, images/file-20-1-p-2600.jpg 2600w, images/file-20-1-p-3200.jpg 3200w, images/file-20-1-.jpg 6000w" mockupSrc="images/dokutar.png" mockupSrcSet="images/dokutar-p-500.png 500w, images/dokutar-p-800.png 800w, images/dokutar-p-1080.png 1080w, images/dokutar-p-1600.png 1600w, images/dokutar.png 2000w" liveLink="https://www.dokutar.de" problem="Dokutar aimed to help businesses of all sizes streamline their tax processes while maintaining full GDPR compliance. Their mission was to offer a secure, user-friendly platform that could save time and reduce costs, positioning them to capture new market opportunities ahead of their competitors. However, their current solution was restricted by scalability limitations. To overcome this, they needed to migrate Dokutar from WordPress to a more robust, dedicated backend that would provide the scalability and speed required." solutionBold="ARG Software worked with MbNetzwerk to develop a more intuitive interface and efficient backend, making tax management as simple as point and click." solution="The tax documentation software successfully addressed all key challenges, delivering a secure, efficient, and user-friendly cloud-based solution for managing tax processes. It enabled seamless document storage and organization, with automated data capture reducing manual entry errors. Workflow automation guided users through the tax documentation process, ensuring compliance and accuracy at every step." logos={['images/group-203114.svg','images/group-203069.svg','images/group-203113.svg','images/group-203065.svg','images/group-203067.svg']} stack="TypeOrm, Express, React, Docker, Jest, MySQL, Node" />
                  <ProjectItem title="Sky Tracks" subtitle="Music Tech" imgSrc="images/file-20-2-.jpg" imgSrcSet="images/file-20-2-p-500.jpg 500w, images/file-20-2-p-800.jpg 800w, images/file-20-2-p-1080.jpg 1080w, images/file-20-2-p-1600.jpg 1600w, images/file-20-2-p-2000.jpg 2000w, images/file-20-2-p-2600.jpg 2600w, images/file-20-2-p-3200.jpg 3200w, images/file-20-2-.jpg 6400w" mockupSrc="images/mockup.png" mockupSrcSet="images/mockup-p-500.png 500w, images/mockup-p-800.png 800w, images/mockup-p-1080.png 1080w, images/mockup-p-1600.png 1600w, images/mockup.png 2000w" liveLink="https://skytracks.io/" problem="Skytracks aimed to develop a cloud-based music production studio that allows musicians, producers, and audio engineers to collaborate online. This required implementing real-time collaboration tools, virtual instruments, cloud storage, an integrated digital audio workstation (DAW), audio effects, and sample libraries. Additionally, ensuring robust security, seamless export options, and compatibility with various devices posed challenges, all while maintaining low latency and a user-friendly interface." solutionBold="ARG Software partnered with SkyTracks to help developing a new leading, cloud-based music production suite." solution="Skytracks successfully launched a cloud-based music studio by leveraging scalable cloud services to host its components. Real-time collaboration was enabled through low-latency streaming technologies like WebRTC. A rich library of virtual instruments, effects, and sample libraries was integrated into an intuitive DAW accessible via web browsers." logos={['images/group-203152.svg','images/group-203061.svg','images/group-203065.svg','images/group-203067.svg','images/group-203111.svg']} stack="Knex, Tone.js, Tailwind, Kpa, Angular, Docker, Jest, Node" />
                  <ProjectItem title="TV Cine" subtitle="Fintech" imgSrc="images/file-20-3-.jpg" imgSrcSet="images/file-20-3-p-500.jpg 500w, images/file-20-3-p-800.jpg 800w, images/file-20-3-p-1080.jpg 1080w, images/file-20-3-p-1600.jpg 1600w, images/file-20-3-p-2000.jpg 2000w, images/file-20-3-p-2600.jpg 2600w, images/file-20-3-p-3200.jpg 3200w, images/file-20-3-.jpg 6400w" mockupSrc="images/tvcine.png" mockupSrcSet="images/tvcine-p-500.png 500w, images/tvcine-p-800.png 800w, images/tvcine-p-1080.png 1080w, images/tvcine-p-1600.png 1600w, images/tvcine.png 2000w" liveLink="https://www.tvcine.pt/" problem="TvCine encountered significant challenges in implementing and maintaining features for its frontend and backoffice systems. The frontend required a user-friendly, intuitive interface while ensuring cross-browser and cross-device compatibility. Responsiveness to different screen sizes and performance optimization were critical for delivering a seamless user experience." solutionBold="By combining digital expertise with innovative technology, the new platform exceeded key performance indicators and highly improved user engagement." solution="TvCine successfully addressed all challenges and achieved its objectives. The frontend was designed to be intuitive, responsive, and compatible across devices and browsers, providing a consistent and efficient user experience. Performance optimization ensured smooth functionality and quick load times." logos={['images/group-203118.svg','images/group-203066.svg','images/entity-20framework.svg','images/group-203157.svg','images/g862.svg']} stack="Vue.js, MongoDb, Entity Framework, .Net Core, Nuxt" />
                  <ProjectItem title="Royalty Flush" subtitle="MUSIC TECH - CWR" imgSrc="images/royalty_flash.jpg" imgSrcSet="images/royalty_flash-p-500.jpg 500w, images/royalty_flash-p-800.jpg 800w, images/royalty_flash-p-1080.jpg 1080w, images/royalty_flash-p-1600.jpg 1600w, images/royalty_flash-p-2000.jpg 2000w, images/royalty_flash-p-2600.jpg 2600w, images/royalty_flash-p-3200.jpg 3200w, images/royalty_flash.jpg 4821w" mockupSrc="images/rf_mockup.png" mockupSrcSet="images/rf_mockup-p-500.png 500w, images/rf_mockup-p-800.png 800w, images/rf_mockup-p-1080.png 1080w, images/rf_mockup-p-1600.png 1600w, images/rf_mockup.png 2000w" liveLink="https://www.northmusicgroup.com/" problem="Developing a music rights management platform presented several challenges due to the complexity of managing music catalogs, tracking royalties, and enforcing rights. Key requirements included organizing extensive metadata for compositions and recordings, calculating and tracking royalties from diverse revenue streams, and facilitating licensing processes for media usage." solutionBold="ARG Software teamed up with North Music Group to create an innovative platform that simplified music rights management." solution="The music rights management platform successfully met all objectives by delivering a robust and comprehensive solution. It provided catalog management with detailed metadata and automated royalty tracking to ensure accurate and transparent calculations." logos={['images/group-203156.svg','images/entity-20framework.svg','images/group-203120.svg','images/group-203065.svg','images/group-203121.svg']} stack=".Net Core, Entity Framework, Octopus Deploy, Docker, React, Hangfire, PostgreSQL, MediatR" />
                  <ProjectItem title="Vector" subtitle="Fintech" imgSrc="images/vector.jpg" imgSrcSet="images/vector-p-500.jpg 500w, images/vector-p-800.jpg 800w, images/vector-p-1080.jpg 1080w, images/vector-p-1600.jpg 1600w, images/vector-p-2000.jpg 2000w, images/vector-p-2600.jpg 2600w, images/vector.jpg 3200w" mockupSrc="images/vector_m.png" mockupSrcSet="images/vector_m-p-500.png 500w, images/vector_m-p-800.png 800w, images/vector_m-p-1080.png 1080w, images/vector_m-p-1600.png 1600w, images/vector_m.png 2000w" liveLink="https://quantapes.com/" problem="The application initially presented significant challenges, arriving in a completely non-functional state. While the user interface was implemented, it was merely illustrative and lacked connection to the backend. The backend itself was dysfunctional, creating frustration for the project owner." solutionBold="ARG Software created a digital solution where, besides connecting every dot, commands worked at first and made sense." solution="To address the challenges, the backend was completely rebuilt from the ground up, leveraging a new technology stack to ensure functionality, efficiency, and reliability. Within just a few months, the reworked application met its objectives, connecting the UI to a fully operational backend and delivering the core functionalities seamlessly." logos={['images/mikrorm.svg','images/g862.svg','images/path-20825.svg','images/group-203124.svg','images/group-203065.svg']} stack="MikroOrm, Next, Kafka, PostgreSQL, Docker, Nx, Webpack, Nest.js" />
                </div>
              </div>
            </div>
          </section>

          {/* ── TESTIMONIALS ── */}
          <section id="testimonials" className="section_testemonials">
            <div className="padding-global">
              <div className="container-medium">
                <div className="testemonials-component">
                  {[
                    { quote: 'It was a pleasure to work with! Good communication solid work and helped us deliver our new version of the product in a timely fashionable way.', author: 'Marc-André Mignault, Project Manager at Skytracks', dotId: 'faa6979d-8144-f4a3-6be9-c26ecc9a40fd' },
                    { quote: "ARG Software were great to work with from the first day. We needed a MVP for our tourism management company and they provided all the technical solutions we required, optimizing and improving our day-to-day operations. I definitely recommend ARG Software's team for their effort and great work. Thank you so much!", author: 'Andre Mendo, CEO at Hostelier', dotId: 'bf504b4b-1161-e79a-96ef-c29cdd486ba3' },
                    { quote: 'Jose and Rui delivered good work and I enjoyed working with them. They transformed a legacy api from PHP to Typescript, where their architectural skills in building an object-oriented backend where really handy. They were quick in extending their knowledge and competence in Typescript-based projects to successfully complete the project. It is likely that we will hire them in the future for projects.', author: 'Hendrik, CTO at Dokutar', dotId: '07264434-2777-74fe-8629-cb6c9e094588' },
                    { quote: "ARG did great! Was awesome to work with and always quick to respond. Great attitude despite project requirements changing. Also helped out in a few tight spots with last-minute requests — highly recommend working with ARG!", author: 'Austin Klise, CEO at Klise Consulting', dotId: 'e59cb7d2-1243-e68c-11be-70a6548fdabf', isLast: true },
                  ].map((t, i) => (
                    <div key={i} className="testemonials-item">
                      <div className="max-width-testemonials align-center">
                        <div className="overflow-hidden">
                          <p data-w-id={i === 0 ? 'c104cc9d-84e0-284d-9f0d-8399721834c5' : undefined} className="text-size-24-18">{t.quote}</p>
                        </div>
                        <div className="padding-bottom padding-62-56"></div>
                        <div className="testemonials-item_name">
                          <div data-w-id={t.dotId} style={{ opacity: 0 }} className="testemonials-item_dot"></div>
                          <div className="text-size-18-15">{t.author}</div>
                        </div>
                      </div>
                      {!t.isLast && (
                        <>
                          <div className="padding-bottom padding-130-74"></div>
                          <div className="line-separate is--testemonials"></div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── WORK WITH US ── */}
          <section id="work-with-us" className="section_work background-color-white">
            <div className="padding-global">
              <div className="container-medium">
                <div className="work-component">
                  <div id="w-node-ea01ea85-4c17-4155-3c4c-6bb7455fb3f5-3c83288f" className="subtitle_tag-wrapper hide-mobile-landscape"><div>Working With Us</div></div>
                  <div className="work-content">
                    <div data-w-id="b5b23643-ebaf-8715-5680-66b9e17b988d" className="work_header-wrapper">
                      <div className="overflow-hidden">
                        <div className="heading_wrap">
<h2 style={{ opacity: 0, transform: 'translate3d(0, 250%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(10deg) skew(0, 0)' }} className="work_heading">From Zero to Hero</h2>
                        </div>
                      </div>
                      <div className="padding-bottom padding-30-44"></div>
                      <p style={{ transform: 'translate3d(0, 2rem, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)', opacity: 0 }} className="work_paragraph">By trusting us, you (always) end up winning. Even if we meet once in a lifetime, you get a solid, lasting partnership where people come first. <br />And each challenge, too.<br />‍<br />Once you decide to go on this adventure, know that your job always comes first. Each client and challenge deserves everything we have, so we don't pile up tasks but instead focus on increasing quality.<br />And yes, we answer fast. So, feel free to tell us what worries you during the process.<br /><br />Don't expect endless emails and calls. We'll discuss everything at the right time.<br /><br />There's no micro-management, only a primary focus: meeting your goals and deadlines.<br />One thing is sure: you'll always get a digital, battle-proof, scalable solution. Expect an all-in team, ready to meet your expectations.</p>
                    </div>
                    <div className="padding-bottom padding-80-76"></div>
                    <div className="work_items-wrapper">
                      {[
                        { end: '1000', label: 'Deploys into production, usually not on Friday', img: 'images/1e53a75c2842b62a1322f4990421622ffed676ba-810x810-402x.png' },
                        { end: '2000', label: 'Finance transactions per second', img: 'images/219c903e193d94f2157d75b6bb23de9423d4208b-810x810-402x.png' },
                        { end: '25', label: 'Years of experience combined', img: 'images/54cba1fec22e71214cc134de9a43525b198eafff-810x810-402x.png' },
                        { end: '6', label: 'Impacted countries', img: 'images/d3a8639078eae63c50a075b928a37280e915ed53-1024x1024-402x.png' },
                      ].map((s, i) => (
                        <div key={i} className="work-item">
                          <div className={`work-item_line${i < 3 ? ' is-mobile' : ''}`}></div>
                          <div className="padding-bottom padding-medium"></div>
                          <div className="count-up_wrap">
                            <h3 fs-numbercount-element="number" fs-numbercount-start="0" fs-numbercount-end={s.end} className="heading-style-h2 z-index-2">0</h3>
                            <h3 className="heading-style-h2 z-index-2">+</h3>
                          </div>
                          <div className="padding-bottom padding-22"></div>
                          <p className="text-color-grey z-index-2">{s.label}</p>
<div className="work_image-wrapper"><img src={s.img} loading="lazy" alt="" className="work-image" width="160" height="160" /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="line-separate is--work"></div>
            </div>
          </section>

          {/* ── TEAM ── */}
          <section id="team" className="section_team background-color-white">
            <div className="padding-global">
              <div className="container-medium">
                <div className="team-component">
                  <div id="w-node-c885e503-7645-c5c3-c5f9-93665c21ea97-3c83288f" className="subtitle_tag-wrapper hide-mobile-landscape"><div>Meet Our Team</div></div>
                    <div className="team-content">
                      <div className="team_header-wrapper">
                        <div className="overflow-hidden">
                          <div className="heading_wrap"><h2 className="team_heading">You can't do anything without brains</h2></div>
                        </div>
                        <div className="padding-bottom padding-30-44"></div>
                        <p data-w-id="1164883d-f971-0a2c-2892-dc069aa3870b" style={{ opacity: 0 }} className="text-color-grey">More than a team — your innovation partners. Meet the passionate experts dedicated to fueling your success.</p>
                      </div>
                      <div className="padding-bottom padding-80-74"></div>
                      <div className="team_items-wrapper">
                      {[
                        {
                          name: 'Jose Antunes',
                          role: 'CO-FOUNDER - Software developer',
                          linkedin: 'https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/',
                          imgId: 'd3f6571f-2a52-032a-a22f-d6dff7799496',
                          nameId: 'a386420a-7b3b-4373-6fbb-83f62a51f900',
                          roleId: '086b6308-ff71-22d6-13a2-67a7344d7305',
                          imgSrc: 'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg',
                          imgSrcSet: 'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0cf402fc001db7242fa_Z%C3%A9.jpg 1024w',
                          imgAlt: 'JoseAntunes - ARG',
                        },
                        {
                          name: 'Rui Rocha',
                          role: 'CO-FOUNDER - Software developer',
                          linkedin: 'https://www.linkedin.com/in/ruirochawork/',
                          imgId: undefined,
                          nameId: 'a928d8ee-7644-3514-7041-c8a3f97f1125',
                          roleId: 'a928d8ee-7644-3514-7041-c8a3f97f1128',
                          imgSrc: 'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1).jpg',
                          imgSrcSet: 'https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1)-p-500.jpg 500w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1)-p-800.jpg 800w, https://cdn.prod.website-files.com/6722756494e163093c832895/6954b0dd01311900973ce362_Rocha%20(1).jpg 1024w',
                          imgAlt: 'RuiRocha - ARG',
                        },
                      ].map((m, i) => (
                        <div key={i} className="team-item">
                          <div data-w-id={m.imgId} className="team_image-wrapper">
<img
  src={m.imgSrc}
  srcSet={m.imgSrcSet}
  sizes="(max-width: 1024px) 100vw, 1024px"
  loading="lazy"
  alt={m.imgAlt}
  className="team_image"
  width="1024"
  height="1024"
/>
                            <div style={{ height: '100%' }} className="team_image-overlay"></div>
                          </div>
                          <div className="team-item_text">
                            <div className="overflow-hidden">
                              <h3 data-w-id={m.nameId} style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="heading-style-h5">{m.name}</h3>
                            </div>
                            <div className="padding-bottom padding-small"></div>
                            <div data-w-id={m.roleId} style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="subtitle-team">{m.role}</div>
                            <div className="padding-bottom padding-small"></div>
                            <a aria-label="Linkedin" href={m.linkedin} target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                              <div className="icon-1x1-small socials-button w-embed">{linkedinSvg}</div>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="padding-bottom padding-80-74"></div>
                    <TransitionLink to="/team" className="text-button w-inline-block">
                      <div className="text-button_list is-dark">
                        <div className="text-button_text">Meet the full team</div>
                        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                      </div>
                      <div className="text-button_list is-animated is-dark">
                        <div className="text-button_text">See everyone</div>
                        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                      </div>
                    </TransitionLink>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── ARTICLES PROMO ── */}
<section className="section_articles-promo" style={{ backgroundColor: '#0c002e' }}>
  <div className="padding-global">
    <div className="container-large">
      <div className="articles-promo_inner">
        <div className="blog_header-wrapper">
          <div className="heading_wrap wrap_social">
            <div className="header-animation hide-mobile-portrait">
              <h2 data-w-id="a76641d2-c8c1-f736-d2de-c0a075a25b47" style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="heading">Engage with us</h2>
            </div>
            <div className="header-animation show-mobile-portrait">
              <h2 data-w-id="a76641d2-c8c1-f736-d2de-c0a075a25b4a" style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}>Innovation you can</h2>
            </div>
            <div className="header-animation show-mobile-portrait">
              <h2 data-w-id="a76641d2-c8c1-f736-d2de-c0a075a25b4d" style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}>wrap your mind</h2>
            </div>
            <div className="header-animation show-mobile-portrait">
              <h2 data-w-id="a76641d2-c8c1-f736-d2de-c0a075a25b50" style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}>around.</h2>
            </div>
          </div>

        </div>

        {/* Centered articles heading */}
        <div className="articles-promo_header" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div className="articles-promo_header-left" style={{ alignItems: 'center' }}>
            <h2 className="heading-style-h2" style={{ color: '#fff', textAlign: 'center' }}>
              We write about<br />what we build.
            </h2>
          </div>
        </div>

        <div className="articles-promo_cards">
          {ARTICLES.map((article) => (
            <TransitionLink key={article.slug} to={`/articles/${article.slug}`} className="articles-promo_card">
              <div className="articles-promo_card-top">
                <div className="articles-promo_card-meta">
                  <div className="subtitle_tag-wrapper"><div>{article.tag}</div></div>
                  <span className="articles-promo_card-date">{article.date}</span>
                </div>
                <svg className="articles-promo_card-arrow" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.77734 8.5L13.3329 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
                  <path d="M9.11133 3.83203L13.778 8.4987L9.11133 13.1654" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
                </svg>
              </div>
              <h3 className="articles-promo_card-title">{article.title}</h3>
            </TransitionLink>
          ))}
        </div>

        {/* Read all articles — below the cards, right-aligned */}
        <div className="articles-promo_footer">
          <TransitionLink to="/articles" className="text-button w-inline-block">
            <div className="text-button_list">
              <div className="text-button_text">Read all articles</div>
              <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
            </div>
            <div className="text-button_list is-animated">
              <div className="text-button_text">Browse the blog</div>
              <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
            </div>
          </TransitionLink>
        </div>
      </div>
    </div>
    <div className="line-separate is--blog hide-mobile-landscape"></div>
  </div>
</section>

          {/* ── SOCIAL ── */}
<section id="social" className="section_blog">
  <div className="padding-global">
    <div className="container-large">
      <div className="blog-component">
        <div className="social-section_header">
          <div>
            <h2 className="heading-style-h2" style={{ color: '#fff' }}>
              See what we're<br />up to.
            </h2>
          </div>
          <a data-w-id="ea5a9a2e-2363-1c70-77ef-e396f5341f49" href="#" className="button-base hiden w-inline-block">
            <div className="button-base_text_wrap">
              <div data-w-id="ea5a9a2e-2363-1c70-77ef-e396f5341f4b" className="button-base__button-text">Social</div>
              <div data-w-id="ea5a9a2e-2363-1c70-77ef-e396f5341f4d" className="button-base__button-text is-animated">View Feed</div>
            </div>
          </a>
        </div>
        <div className="swiper_blog-component">
<div className="w-embed w-script">
  <div className="elfsight-app-aafa18f0-0e7e-4ff0-a44e-5c047f44429b"></div>
</div>
        </div>
      </div>
    </div>
    <div className="line-separate is--blog hide-mobile-landscape"></div>
  </div>
</section>

          {/* ── FAQ ── */}
          <section id="faq" className="section_faq">
            <div className="padding-global">
              <div className="container-large">
                <div className="faq_header">
                  <div className="heading_wrap">
                    <h2 style={{ color: '#fff' }}>Common questions,<br />honest answers.</h2>
                  </div>
          <a data-w-id="ea5a9a2e-2363-1c70-77ef-e396f5341f49" href="#" className="button-base hiden w-inline-block">
            <div className="button-base_text_wrap">
              <div data-w-id="ea5a9a2e-2363-1c70-77ef-e396f5341f4b" className="button-base__button-text">FAQ</div>
              <div data-w-id="ea5a9a2e-2363-1c70-77ef-e396f5341f4d" className="button-base__button-text is-animated">View Feed</div>
            </div>
          </a>
                </div>
                <div className="faq_list">
                  {faqItems.map((item, i) => (
                    <div key={i} className="faq_item">
                      <button className="faq_question" aria-expanded="false">
                        <span className="faq_question_text">{item.q}</span>
                        <span className="faq_icon">+</span>
                      </button>
                      <div className="faq_answer">
                        <div className="faq_answer_inner">{item.a}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── CONTACT ── */}
          <section id="contact" className="section_cta">
            <div className="padding-global is--cta-mobile">
              <div className="container-large">

                {/* CTA wrapper — portfolio link (matches HTML structure) */}
                <div className="cta-wrapper">
                  <div className="cta-content">
                    <div className="heading_wrap">
                      <div className="header-animation hide-tablet">
                        <h2
                          data-w-id="56016045-6d3b-3314-c750-b8757587bc0f"
                          style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                          className="heading-style-h1 hide-mobile-portrait"
                        >
                          Built for scale
                        </h2>
                      </div>
                      <div className="header-animation show-tablet">
                        <h2
                          data-w-id="61119dee-a65e-a624-b8fe-664d48050e05"
                          style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                          className="heading-style-h1 hide-mobile-portrait"
                        >
                          Explore
                        </h2>
                      </div>
                      <div className="header-animation hide-tablet">
                        <h2
                          data-w-id="965ad8ce-d1ff-77b6-6ae7-091aab3a6bad"
                          style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                          className="heading-style-h1"
                        >
                          <span className="text-color-gradiant-2">Shipped to production. Across industries.</span>
                        </h2>
                      </div>
                      <div className="header-animation show-mobile-portrait">
                        <h2
                          data-w-id="56016045-6d3b-3314-c750-b8757587bc15"
                          style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                          className="heading-style-h1 show-tablet"
                        >
                          Explore
                        </h2>
                      </div>
                      <div className="header-animation show-tablet">
                        <h2
                          data-w-id="56016045-6d3b-3314-c750-b8757587bc1e"
                          className="heading-style-h1 text-color-gradiant"
                        >
                          <span className="text-color-gradiant-2">what we've shipped.</span>
                        </h2>
                      </div>
                    </div>
                    <div className="padding-bottom padding-48"></div>
                    <a
                      data-w-id="1c718dab-b4cb-cfe7-13e8-ab3f7368a01e"
                      style={{ opacity: 0 }}
                      href="https://tinyurl.com/argsoft"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-base button-contact w-inline-block"
                    >
                      <div className="button-base_text_wrap">
                        <div data-w-id="1c718dab-b4cb-cfe7-13e8-ab3f7368a020" className="button-base__button-text">Show me more</div>
                        <div data-w-id="1c718dab-b4cb-cfe7-13e8-ab3f7368a022" className="button-base__button-text is-animated">      View Portfolio</div>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="padding-bottom padding-130-74"></div>

                {/* Typeform video section */}
                <div className="typeform-wrapper-o5kxhiic">
                  <div
                    data-poster-url="images/6722756494e163093c832895-2f6745c7f9296fdde5324c3539_18458403-hd_1920_1080_24fps-poster-00001.jpg"
                    data-video-urls="images/6722756494e163093c832895-2f6745c7f9296fdde5324c3539_18458403-hd_1920_1080_24fps-transcode.mp4,images/6722756494e163093c832895-2f6745c7f9296fdde5324c3539_18458403-hd_1920_1080_24fps-transcode.webm"
                    data-autoplay="true"
                    data-loop="true"
                    data-wf-ignore="true"
                    className="background-video-2 formtext w-background-video w-background-video-atom"
                  >
                    <video autoPlay loop muted playsInline style={{ backgroundImage: 'url("images/6722756494e163093c832895-2f6745c7f9296fdde5324c3539_18458403-hd_1920_1080_24fps-poster-00001.jpg")' }} data-wf-ignore="true" data-object-fit="cover">
                      <source src="images/cta-video-opt.mp4" data-wf-ignore="true" />

                    </video>
                    <div className="formtext form-click">
                      <div className="header-animation form">
                        <h2
                          data-w-id="4449cd61-6b68-de73-f730-a1b2266f5192"
                          className="heading-style-h1 form-header"
                          style={{ transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                        >
                          You want real results?
                        </h2>
                        <div className="padding-bottom padding-48"></div>
                      </div>
                      <div className="padding-bottom padding-48"></div>
                      <a
                        data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f42"
                        style={{ opacity: 0 }}
                        href="https://5ppw8e4ewzu.typeform.com/to/O5kXHIiC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-base form-button w-inline-block"
                      >
                        <div className="button-base_text_wrap">
                          <div data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f44" className="button-base__button-text">Let's start</div>
                          <div data-w-id="3f303bcf-0478-e5d9-eecb-4de616fd2f46" className="button-base__button-text is-animated">2 minutes</div>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        </main>

        {/* ══════════════════════ FOOTER ══════════════════════ */}
        <footer className="footer">
          <div className="container-medium footer-container padding-global">
            <div className="line-separate is--footer"></div>
            <div className="footer_copywrite-content">
              <div className="overflow-hidden">
<div data-w-id="65437121-d89f-1a6b-706c-c7382d01d634" style={{ opacity: 0, transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="hide-mobile-landscape">© Arg 2026. All Rights Reserved</div>
              </div>
              <div className="footer_copywrite-buttons">
                <a aria-label="Linkedin" href="https://www.linkedin.com/company/arg-software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{linkedinSvg}</div>
                </a>
                <a aria-label="Github" href="https://github.com/ARG-Software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{githubSvg}</div>
                </a>
                <a aria-label="Medium" href="https://medium.com/@arg-software" target="_blank" rel="noopener noreferrer" className="text-button w-inline-block">
                  <div className="icon-1x1-small socials-button w-embed">{mediumSvg}</div>
                </a>
              </div>
              <div className="footer_copywrite-text-mobile">
<div data-w-id="174cb714-f667-c53e-3e09-63bdbb235a43" style={{ opacity: 0, transform: 'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }} className="text-block-2">Arg is based in Funchal and Porto, Portugal</div>
                <div className="show-mobile-landscape">© Arg 2026. All Rights Reserved</div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
