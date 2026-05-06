import { useEffect, useRef } from 'react';
import { useRAF } from './useRAF';
import { gsap } from 'gsap';

export function useCinematicZoomBlur(canvasRef, fallbackRef, imageSrc) {
  const renderRef = useRef(null);
  const cleanupRef = useRef(null);
  const mountedRef = useRef(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef?.current;
    const fallback = fallbackRef?.current;
    if (!canvas || !imageSrc) return;

    mountedRef.current = true;
    visibleRef.current = true;

    // Safety timeout: show fallback if WebGL takes too long
    const safetyTimeout = window.setTimeout(() => {
      if (fallback && mountedRef.current) {
        gsap.to(fallback, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      }
    }, 3000);

    const visibilityObserver = new IntersectionObserver(
      entries => {
        visibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    visibilityObserver.observe(canvas);

    let THREE = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let mesh = null;
    let material = null;
    let texture = null;

    const init = async () => {
      if (!mountedRef.current) return;

      THREE = await import('three');
      if (!mountedRef.current) return;

      const container = canvas.parentElement;
      const width = container.offsetWidth || window.innerWidth;
      const height = container.offsetHeight || window.innerHeight;

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const loader = new THREE.TextureLoader();

      texture = await new Promise((resolve, reject) => {
        loader.load(
          imageSrc,
          tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            resolve(tex);
          },
          undefined,
          reject
        );
      });
      if (!mountedRef.current) return;

      const uCenter = { value: new THREE.Vector2(0.5, 0.5) };
      const uStrength = { value: -2 };
      const uUVOffset = { value: new THREE.Vector2(0, 0) };
      const uUVScale = { value: new THREE.Vector2(1, 1) };

      const geometry = new THREE.PlaneGeometry(2, 2);

      material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          map: { value: texture },
          center: uCenter,
          strength: uStrength,
          uvOffset: uUVOffset,
          uvScale: uUVScale,
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          uniform vec2 center;
          uniform float strength;
          uniform vec2 uvOffset;
          uniform vec2 uvScale;
          varying vec2 vUv;

          float random(vec3 scale, float seed) {
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
          }

          void main() {
            vec2 tUv = vUv * uvScale + uvOffset;
            if (abs(strength) > 0.001) {
              vec4 color = vec4(0.0);
              float total = 0.0;
              vec2 toCenter = center * uvScale + uvOffset - tUv;

              float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);

              for (float t = 0.0; t <= 20.0; t++) {
                float percent = (t + offset) / 20.0;
                float weight = 2.0 * (percent - percent * percent);
                vec4 texel = texture2D(map, tUv + toCenter * percent * strength);
                texel.rgb *= texel.a;
                color += texel * weight;
                total += weight;
              }

              gl_FragColor = color / total;
              gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
              gl_FragColor.a = 1.0 - abs(strength);
            } else {
              gl_FragColor = texture2D(map, tUv);
            }
          }
        `,
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const doResize = () => {
        if (!mesh || !texture || !renderer) return;
        const size = renderer.getSize(new THREE.Vector2());
        const aspect = size.x / size.y;
        const imgAspect = texture.image.width / texture.image.height;

        uUVOffset.value.set(0, 0);
        uUVScale.value.set(1, 1);

        if (imgAspect > aspect) {
          uUVScale.value.x = aspect / imgAspect;
          uUVOffset.value.x = (1 - uUVScale.value.x) / 2;
        } else {
          uUVScale.value.y = imgAspect / aspect;
          uUVOffset.value.y = (1 - uUVScale.value.y) / 2;
        }
      };

      doResize();

      renderer.render(scene, camera);

      // Clear safety timeout — WebGL loaded successfully
      window.clearTimeout(safetyTimeout);

      // Fade canvas in, keep fallback hidden
      gsap.to(canvas, { opacity: 1, duration: 0.5, ease: 'power2.out' });

      gsap.fromTo(uStrength, { value: -2 }, { value: 0, duration: 2.5, ease: 'power2.out' });

      const targetCenter = { x: 0.5, y: 0.5 };
      const currentCenter = { x: 0.5, y: 0.5 };

      const handleMouseMove = e => {
        const rect = canvas.getBoundingClientRect();
        targetCenter.x = (e.clientX - rect.left) / rect.width;
        targetCenter.y = (e.clientY - rect.top) / rect.height;
      };

      canvas.addEventListener('mousemove', handleMouseMove);

      renderRef.current = () => {
        if (!mountedRef.current || !visibleRef.current || !renderer || !scene || !camera) return;

        currentCenter.x += (targetCenter.x - currentCenter.x) * 0.08;
        currentCenter.y += (targetCenter.y - currentCenter.y) * 0.08;
        uCenter.value.set(currentCenter.x, currentCenter.y);

        renderer.render(scene, camera);
      };

      const handleResize = () => {
        if (!mountedRef.current || !renderer) return;
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        renderer.setSize(w, h, false);
        doResize();
      };

      window.addEventListener('resize', handleResize);

      cleanupRef.current = () => {
        window.clearTimeout(safetyTimeout);
        visibilityObserver.disconnect();
        gsap.killTweensOf(canvas);
        if (fallback) gsap.killTweensOf(fallback);
        canvas.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (texture) texture.dispose();
        if (renderer) renderer.dispose();
      };
    };

    init().catch(err => {
      // WebGL failed — show fallback image
      window.clearTimeout(safetyTimeout);
      if (fallback && mountedRef.current) {
        gsap.to(fallback, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      }
      console.error('Cinematic zoom-blur failed:', err);
    });

    return () => {
      mountedRef.current = false;
      window.clearTimeout(safetyTimeout);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [canvasRef, fallbackRef, imageSrc]);

  useRAF(() => {
    if (renderRef.current) renderRef.current();
  }, []);
}
