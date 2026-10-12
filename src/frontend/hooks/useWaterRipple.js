import { useContext, useEffect, useRef } from 'react';
import { useRAF } from './useRAF';
import { LoadingContext } from '../providers/LoadingProvider';
import {
  WATER_DISPLAY_SHADER,
  WATER_NORMAL_SHADER,
  WATER_SIMULATION_SHADER,
  WATER_VERTEX_SHADER,
} from '../animations/shaders/waterRipple.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const MOUSE_STRENGTH = 0.35;
const MOUSE_RADIUS = 0.06;
const REFRACTION_SCALE = 0.07;
// #0c002e → vec3(0.047, 0.0, 0.18)
const BASE_COLOR = [0.047, 0.0, 0.18];
const VIDEO_OPACITY = 0.09;
// Normal map resolution for text displacement (kept small to minimise readPixels cost)
const NM_W = 64;
const NM_H = 36;
// Text-displacement filter: stops generating base64 data URLs when idle
const TEXT_FILTER_ACTIVE_MS = 1800;
const STARTUP_IDLE_TIMEOUT_MS = 2500;
const STARTUP_FALLBACK_DELAY_MS = 1500;
const RESIZE_DEBOUNCE_MS = 250;
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Start-up scheduling ───────────────────────────────────────────────────────

function scheduleIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout: STARTUP_IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, STARTUP_FALLBACK_DELAY_MS);
  return () => window.clearTimeout(timeoutId);
}

// Waits for the page to finish loading, then for an idle period, so the
// WebGL start-up does not compete with first render.
function scheduleStartupInit(callback) {
  let cancelIdle = null;
  const handleLoad = () => {
    cancelIdle = scheduleIdle(callback);
  };

  if (document.readyState === 'complete') {
    handleLoad();
  } else {
    window.addEventListener('load', handleLoad, { once: true });
  }

  return () => {
    window.removeEventListener('load', handleLoad);
    cancelIdle?.();
  };
}

// Runs the callback on the next frame once calls have stopped for `delay` ms.
function debounceToFrame(callback, delay) {
  let timeoutId = null;
  let frameId = null;

  const cancel = () => {
    clearTimeout(timeoutId);
    cancelAnimationFrame(frameId);
  };
  const schedule = () => {
    cancel();
    timeoutId = setTimeout(() => {
      frameId = requestAnimationFrame(callback);
    }, delay);
  };

  return { schedule, cancel };
}

// ── Video and pointer geometry ────────────────────────────────────────────────

// object-fit: cover for the video, as a UV scale and offset.
// Returns null until both the video and the canvas have a size.
function getVideoCover(videoEl, canvas) {
  if (!videoEl.videoWidth || !videoEl.videoHeight) return null;

  let { width, height } = canvas.getBoundingClientRect();
  if ((width <= 0 || height <= 0) && canvas.parentElement) {
    ({ width, height } = canvas.parentElement.getBoundingClientRect());
  }
  if (width <= 0 || height <= 0) return null;

  const videoAspect = videoEl.videoWidth / videoEl.videoHeight;
  const canvasAspect = width / height;

  if (canvasAspect > videoAspect) {
    const scaleY = videoAspect / canvasAspect;
    return { scaleX: 1, scaleY, offsetX: 0, offsetY: (1 - scaleY) / 2 };
  }
  const scaleX = canvasAspect / videoAspect;
  return { scaleX, scaleY: 1, offsetX: (1 - scaleX) / 2, offsetY: 0 };
}

// Mouse or touch position inside the hero as UV coordinates (origin bottom-left).
function getPointerUv(event, heroEl) {
  const point = event.touches ? event.touches[0] : event;
  const rect = heroEl.getBoundingClientRect();
  return [(point.clientX - rect.left) / rect.width, 1.0 - (point.clientY - rect.top) / rect.height];
}

// ── Text displacement (SVG filter fed by the water's normal map) ──────────────

// Offscreen 2D canvas that turns normal-map pixels into data URLs for the filter.
function createNormalMapCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = NM_W;
  canvas.height = NM_H;
  canvas.style.cssText =
    'position:absolute;pointer-events:none;visibility:hidden;width:0;height:0;';
  document.body.appendChild(canvas);

  const context = canvas.getContext('2d');
  const imageData = new ImageData(NM_W, NM_H);
  const rowLength = NM_W * 4;

  // WebGL reads rows bottom-up; the 2D canvas expects them top-down
  const toDataUrl = pixels => {
    for (let y = 0; y < NM_H; y++) {
      const sourceRow = (NM_H - 1 - y) * rowLength;
      imageData.data.set(pixels.subarray(sourceRow, sourceRow + rowLength), y * rowLength);
    }
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  };

  // Flat normal map — no displacement when idle
  const neutralPixels = new Uint8Array(NM_W * NM_H * 4);
  for (let i = 0; i < neutralPixels.length; i += 4) {
    neutralPixels.set([128, 128, 128, 255], i);
  }

  return { toDataUrl, neutralDataUrl: toDataUrl(neutralPixels), remove: () => canvas.remove() };
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

// Displacement filter applied to the hero heading so the text bends with the water.
function createTextFilter(heroEl, neutralDataUrl) {
  const filterEl = createSvgElement('filter', {
    id: 'water-text-filter',
    filterUnits: 'userSpaceOnUse',
    primitiveUnits: 'userSpaceOnUse',
    x: '-100',
    y: '-100',
    width: '3000',
    height: '800',
    'color-interpolation-filters': 'sRGB',
  });
  const feImage = createSvgElement('feImage', {
    result: 'wmap',
    x: '-100',
    y: '-100',
    width: '3000',
    height: '800',
    preserveAspectRatio: 'none',
    href: neutralDataUrl,
  });
  const feDisplacement = createSvgElement('feDisplacementMap', {
    in: 'SourceGraphic',
    in2: 'wmap',
    scale: '6',
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  });

  const svgEl = createSvgElement('svg');
  svgEl.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  const defs = createSvgElement('defs');
  filterEl.append(feImage, feDisplacement);
  defs.append(filterEl);
  svgEl.append(defs);
  document.body.appendChild(svgEl);

  const styleEl = document.createElement('style');
  styleEl.textContent = '.hero_heading { filter: url(#water-text-filter); }';
  document.head.appendChild(styleEl);

  const headingEl = heroEl.querySelector('.hero_heading');

  // Stretch the map over the whole hero, positioned relative to the heading
  const updateGeometry = () => {
    if (!headingEl) return;
    const heroRect = heroEl.getBoundingClientRect();
    const headRect = headingEl.getBoundingClientRect();
    const relX = headRect.left - heroRect.left;
    const relY = headRect.top - heroRect.top;
    feImage.setAttribute('x', String(-relX));
    feImage.setAttribute('y', String(-relY));
    feImage.setAttribute('width', String(heroRect.width));
    feImage.setAttribute('height', String(heroRect.height));
    filterEl.setAttribute('x', String(-relX - 30));
    filterEl.setAttribute('y', String(-relY - 30));
    filterEl.setAttribute('width', String(heroRect.width + 60));
    filterEl.setAttribute('height', String(heroRect.height + 60));
  };
  updateGeometry();

  return {
    setMap: dataUrl => feImage.setAttribute('href', dataUrl),
    updateGeometry,
    remove: () => {
      styleEl.remove();
      svgEl.remove();
    },
  };
}

// ── Shader compilation ────────────────────────────────────────────────────────

// Compiles each pass against the target it renders to, without blocking the main thread.
function compilePasses(renderer, camera, passes) {
  const ready = passes.map(([pass, target]) => {
    renderer.setRenderTarget(target);
    return renderer.compileAsync(pass.scene, camera);
  });
  renderer.setRenderTarget(null);
  return Promise.all(ready);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWaterRipple(canvasId = 'water-ripple-canvas') {
  const cleanupRef = useRef(null);
  const renderRef = useRef(null);
  const loadingDone = useContext(LoadingContext);

  useEffect(() => {
    // The intro covers the hero on a first visit; start once it has finished
    if (!loadingDone) return;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Skip for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let mounted = true;
    let initialized = false;
    let cancelScheduledInit = null;

    const init = async () => {
      if (!mounted || initialized) return;
      initialized = true;

      const {
        HalfFloatType,
        LinearFilter,
        Mesh,
        OrthographicCamera,
        PlaneGeometry,
        RGBAFormat,
        Scene,
        ShaderMaterial,
        SRGBColorSpace,
        UnsignedByteType,
        Vector2,
        Vector3,
        VideoTexture,
        WebGLRenderer,
        WebGLRenderTarget,
      } = await import('three');
      if (!mounted) return;

      const rect = canvas.getBoundingClientRect();
      const width = Math.floor(rect.width || canvas.offsetWidth || window.innerWidth);
      const height = Math.floor(rect.height || canvas.offsetHeight || window.innerHeight);
      if (width <= 0 || height <= 0) return;

      const simWidth = Math.floor(width / 2);
      const simHeight = Math.floor(height / 2);

      // ── Renderer ────────────────────────────────────────────────────────
      const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.autoClear = false;

      // Creating the WebGL context is the costliest step; let the browser breathe before the rest.
      await new Promise(resolve => setTimeout(resolve));
      if (!mounted) {
        renderer.dispose();
        return;
      }

      // ── Video texture ────────────────────────────────────────────────────
      const videoEl = document.getElementById('hero-video');
      const videoBgWrapper = canvas.parentElement.querySelector('.hero_bg-video');
      let videoTexture = null;
      if (videoEl) {
        videoTexture = new VideoTexture(videoEl);
        videoTexture.colorSpace = SRGBColorSpace;
        videoTexture.minFilter = LinearFilter;
        videoTexture.magFilter = LinearFilter;
        videoTexture.flipY = false;
      }

      // ── Render targets ───────────────────────────────────────────────────
      const createSimulationTargets = (targetWidth, targetHeight) => {
        const options = {
          minFilter: LinearFilter,
          magFilter: LinearFilter,
          format: RGBAFormat,
          type: HalfFloatType,
        };
        return [
          new WebGLRenderTarget(targetWidth, targetHeight, options),
          new WebGLRenderTarget(targetWidth, targetHeight, options),
        ];
      };

      let [readTarget, writeTarget] = createSimulationTargets(simWidth, simHeight);
      const normalTarget = new WebGLRenderTarget(NM_W, NM_H, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
        type: UnsignedByteType,
      });

      // ── Passes: one full-screen quad per shader ──────────────────────────
      const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quad = new PlaneGeometry(2, 2);

      const createPass = (fragmentShader, uniforms) => {
        const material = new ShaderMaterial({
          vertexShader: WATER_VERTEX_SHADER,
          fragmentShader,
          uniforms,
        });
        const scene = new Scene();
        scene.add(new Mesh(quad, material));
        return { material, scene };
      };

      const simulation = createPass(WATER_SIMULATION_SHADER, {
        u_prev: { value: readTarget.texture },
        u_res: { value: new Vector2(simWidth, simHeight) },
        u_mouse: { value: new Vector2(-1, -1) },
        u_radius: { value: MOUSE_RADIUS },
        u_strength: { value: MOUSE_STRENGTH },
        u_addImpulse: { value: 0 },
      });

      const display = createPass(WATER_DISPLAY_SHADER, {
        u_heightMap: { value: writeTarget.texture },
        u_video: { value: videoTexture },
        u_res: { value: new Vector2(width, height) },
        u_baseColor: { value: new Vector3(...BASE_COLOR) },
        u_refractionScale: { value: REFRACTION_SCALE },
        u_videoOpacity: { value: VIDEO_OPACITY },
        u_coverScale: { value: new Vector2(1, 1) },
        u_coverOffset: { value: new Vector2(0, 0) },
      });

      // Drives the text displacement
      const normal = createPass(WATER_NORMAL_SHADER, {
        u_heightMap: { value: null },
        u_res: { value: new Vector2(simWidth, simHeight) },
      });

      // ── Cover UV (simulates object-fit: cover for the video) ─────────────
      const setVideoCover = () => {
        if (!videoEl || !mounted) return;

        const cover = getVideoCover(videoEl, canvas);
        if (!cover) {
          setTimeout(setVideoCover, 100);
          return;
        }

        display.material.uniforms.u_coverScale.value.set(cover.scaleX, cover.scaleY);
        display.material.uniforms.u_coverOffset.value.set(cover.offsetX, cover.offsetY);
        display.material.uniformsNeedUpdate = true;
      };

      if (videoEl?.videoWidth) {
        setVideoCover();
      } else if (videoEl) {
        videoEl.addEventListener('loadedmetadata', setVideoCover, { once: true });
      }

      // ── Text displacement ────────────────────────────────────────────────
      const heroEl = canvas.closest('.hero_wrap') || canvas.parentElement;
      const normalPixels = new Uint8Array(NM_W * NM_H * 4);
      const normalMap = createNormalMapCanvas();
      const textFilter = createTextFilter(heroEl, normalMap.neutralDataUrl);
      let textFilterActiveUntil = 0;
      let textFilterIsNeutral = true;

      // ── Render function (called by RAF coordinator) ───────────────────────
      const render = () => {
        if (!mounted) return;

        simulation.material.uniforms.u_prev.value = readTarget.texture;
        renderer.setRenderTarget(writeTarget);
        renderer.render(simulation.scene, camera);
        simulation.material.uniforms.u_addImpulse.value = 0;

        // Expensive normal-map readback: skip when idle
        if (performance.now() < textFilterActiveUntil) {
          normal.material.uniforms.u_heightMap.value = writeTarget.texture;
          renderer.setRenderTarget(normalTarget);
          renderer.render(normal.scene, camera);
          renderer.readRenderTargetPixels(normalTarget, 0, 0, NM_W, NM_H, normalPixels);
          textFilter.setMap(normalMap.toDataUrl(normalPixels));
          textFilterIsNeutral = false;
        } else if (!textFilterIsNeutral) {
          textFilter.setMap(normalMap.neutralDataUrl);
          textFilterIsNeutral = true;
        }

        display.material.uniforms.u_heightMap.value = writeTarget.texture;
        renderer.setRenderTarget(null);
        renderer.render(display.scene, camera);

        [readTarget, writeTarget] = [writeTarget, readTarget];
      };

      // ── Mouse / touch events ─────────────────────────────────────────────
      const handlePointerMove = event => {
        simulation.material.uniforms.u_mouse.value.set(...getPointerUv(event, heroEl));
        simulation.material.uniforms.u_addImpulse.value = 1;
        textFilterActiveUntil = performance.now() + TEXT_FILTER_ACTIVE_MS;
      };

      heroEl.addEventListener('mousemove', handlePointerMove, { passive: true });
      heroEl.addEventListener('touchmove', handlePointerMove, { passive: true });

      // ── Resize ────────────────────────────────────────────────────────────
      const resize = () => {
        if (!mounted) return;

        const canvasRect = canvas.getBoundingClientRect();
        const newWidth = Math.floor(canvasRect.width);
        const newHeight = Math.floor(canvasRect.height);
        if (newWidth <= 0 || newHeight <= 0) return;

        const current = renderer.getSize(new Vector2());
        if (Math.abs(newWidth - current.x) <= 1 && Math.abs(newHeight - current.y) <= 1) return;

        const newSimWidth = Math.floor(newWidth / 2);
        const newSimHeight = Math.floor(newHeight / 2);

        renderer.setSize(newWidth, newHeight, false);

        readTarget.dispose();
        writeTarget.dispose();
        [readTarget, writeTarget] = createSimulationTargets(newSimWidth, newSimHeight);
        for (const target of [readTarget, writeTarget]) {
          renderer.setRenderTarget(target);
          renderer.clear();
        }
        renderer.setRenderTarget(null);

        simulation.material.uniforms.u_res.value.set(newSimWidth, newSimHeight);
        display.material.uniforms.u_res.value.set(newWidth, newHeight);
        simulation.material.uniformsNeedUpdate = true;
        display.material.uniformsNeedUpdate = true;

        setVideoCover();
        textFilter.updateGeometry();
        textFilter.setMap(normalMap.neutralDataUrl);
        textFilterIsNeutral = true;
      };

      const debouncedResize = debounceToFrame(resize, RESIZE_DEBOUNCE_MS);
      window.addEventListener('resize', debouncedResize.schedule);

      let resizeObserver = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(debouncedResize.schedule);
        resizeObserver.observe(canvas);
      }

      // ── WebGL context loss/restore ────────────────────────────────────────
      const handleContextLost = event => {
        event.preventDefault();
      };

      const handleContextRestored = () => {
        initialized = false;
        if (mounted) init();
      };

      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      // ── Cleanup ───────────────────────────────────────────────────────────
      cleanupRef.current = () => {
        heroEl.removeEventListener('mousemove', handlePointerMove);
        heroEl.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('resize', debouncedResize.schedule);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        debouncedResize.cancel();
        resizeObserver?.disconnect();

        textFilter.remove();
        normalMap.remove();
        if (videoBgWrapper) videoBgWrapper.style.visibility = '';

        videoTexture?.dispose();
        readTarget.dispose();
        writeTarget.dispose();
        normalTarget.dispose();
        simulation.material.dispose();
        display.material.dispose();
        normal.material.dispose();
        quad.dispose();
        renderer.dispose();
      };

      // Only start rendering once all three shaders are ready
      await compilePasses(renderer, camera, [
        [simulation, writeTarget],
        [normal, normalTarget],
        [display, null],
      ]);
      if (!mounted) return;

      // Hide the original video element — Three.js renders it now
      if (videoBgWrapper) videoBgWrapper.style.visibility = 'hidden';
      renderRef.current = render;
    };

    // Lazy-init via IntersectionObserver (hero is above fold — fires immediately)
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          cancelScheduledInit = scheduleStartupInit(init);
          observer.disconnect();
        }
      },
      { rootMargin: '0px' }
    );

    observer.observe(canvas);

    return () => {
      mounted = false;
      observer.disconnect();
      cancelScheduledInit?.();
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [canvasId, loadingDone]);

  // Subscribe to the RAF coordinator — the render function is called every frame
  useRAF(() => {
    if (renderRef.current) {
      renderRef.current();
    }
  }, []);
}
