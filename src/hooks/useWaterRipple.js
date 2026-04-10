import { useEffect, useRef } from 'react';

// ── Shaders ───────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SIM_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D u_prev;
  uniform vec2      u_res;
  uniform vec2      u_mouse;
  uniform float     u_radius;
  uniform float     u_strength;
  uniform int       u_addImpulse;
  varying vec2 v_uv;

  void main() {
    vec2 texel = 1.0 / u_res;
    float center = texture2D(u_prev, v_uv).r;
    float left   = texture2D(u_prev, v_uv + vec2(-texel.x, 0.0)).r;
    float right  = texture2D(u_prev, v_uv + vec2( texel.x, 0.0)).r;
    float up     = texture2D(u_prev, v_uv + vec2(0.0,  texel.y)).r;
    float down   = texture2D(u_prev, v_uv + vec2(0.0, -texel.y)).r;
    float old    = texture2D(u_prev, v_uv).g;

    float damping = 0.96;
    float next = ((left + right + up + down) / 2.0 - old) * damping;

    if (u_addImpulse == 1) {
      float dist = length(v_uv - u_mouse);
      next += u_strength * smoothstep(u_radius, 0.0, dist);
    }
    // r = new height, g = current height (becomes old next frame)
    gl_FragColor = vec4(next, center, 0.0, 1.0);
  }
`;

const DISPLAY_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_video;
  uniform vec2      u_res;
  uniform vec3      u_baseColor;
  uniform float     u_refractionScale;
  uniform float     u_videoOpacity;
  uniform vec2      u_coverScale;
  uniform vec2      u_coverOffset;
  varying vec2 v_uv;

  void main() {
    vec2 texel = 1.0 / u_res;
    float hL = texture2D(u_heightMap, v_uv + vec2(-texel.x, 0.0)).r;
    float hR = texture2D(u_heightMap, v_uv + vec2( texel.x, 0.0)).r;
    float hD = texture2D(u_heightMap, v_uv + vec2(0.0, -texel.y)).r;
    float hU = texture2D(u_heightMap, v_uv + vec2(0.0,  texel.y)).r;

    vec2 normal = vec2(hL - hR, hD - hU);
    float height = texture2D(u_heightMap, v_uv).r;

    // Apply object-fit:cover transform then displace by water normals
    vec2 coverUV = v_uv * u_coverScale + u_coverOffset;
    vec2 distortedUV = clamp(coverUV + normal * u_refractionScale, 0.0, 1.0);

    vec3 videoColor = texture2D(u_video, distortedUV).rgb;
    vec3 color = mix(u_baseColor, videoColor, u_videoOpacity);

    float spec = pow(max(0.0, dot(normalize(vec3(normal, 0.8)),
                                  normalize(vec3(0.3, 0.5, 1.0)))), 24.0);
    color += spec * vec3(0.18, 0.12, 0.35) * 0.25;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const NORMAL_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D u_heightMap;
  uniform vec2      u_res;
  varying vec2 v_uv;

  void main() {
    vec2 texel = 1.0 / u_res;
    float hL = texture2D(u_heightMap, v_uv + vec2(-texel.x, 0.0)).r;
    float hR = texture2D(u_heightMap, v_uv + vec2( texel.x, 0.0)).r;
    float hD = texture2D(u_heightMap, v_uv + vec2(0.0, -texel.y)).r;
    float hU = texture2D(u_heightMap, v_uv + vec2(0.0,  texel.y)).r;
    vec2 normal = vec2(hL - hR, hD - hU);
    // Map normals to 0–1: 0.5 = neutral (no displacement)
    gl_FragColor = vec4(clamp(normal.x * 1.5 + 0.5, 0.0, 1.0),
                        clamp(normal.y * 1.5 + 0.5, 0.0, 1.0),
                        0.5, 1.0);
  }
`;

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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWaterRipple(canvasId = 'water-ripple-canvas') {
  const animationId = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Skip for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let mounted = true;

    const init = async () => {
      if (!mounted) return;

      const THREE = await import('three');
      if (!mounted) return;

      const W = canvas.offsetWidth || window.innerWidth;
      const H = canvas.offsetHeight || window.innerHeight;
      const SIM_W = Math.floor(W / 2);
      const SIM_H = Math.floor(H / 2);

      // ── Video texture ────────────────────────────────────────────────────
      const videoEl = document.getElementById('hero-video');
      let videoTexture = null;
      if (videoEl) {
        videoTexture = new THREE.VideoTexture(videoEl);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        // CRITICAL FIX: Disable Y-flipping for consistent texture coordinates
        // Default is true for WebGL 1.0 compatibility, but causes coordinate mismatch
        videoTexture.flipY = false;
      }

      // Hide the original video element — Three.js renders it now
      const videoBgWrapper = canvas.parentElement.querySelector('.hero_bg-video');
      if (videoBgWrapper) videoBgWrapper.style.visibility = 'hidden';

      // ── Renderer ────────────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
      renderer.setPixelRatio(1);
      renderer.setSize(W, H, false);
      renderer.autoClear = false;

      // ── Render targets ───────────────────────────────────────────────────
      const rtOptions = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      };
      let rtA = new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtOptions);
      let rtB = new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtOptions);
      let readTarget = rtA;
      let writeTarget = rtB;

      // ── Camera ───────────────────────────────────────────────────────────
      const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      // ── Simulation quad ──────────────────────────────────────────────────
      const quadGeo = new THREE.PlaneGeometry(2, 2);

      const simMaterial = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: SIM_FRAG,
        uniforms: {
          u_prev: { value: rtA.texture },
          u_res: { value: new THREE.Vector2(SIM_W, SIM_H) },
          u_mouse: { value: new THREE.Vector2(-1, -1) },
          u_radius: { value: MOUSE_RADIUS },
          u_strength: { value: MOUSE_STRENGTH },
          u_addImpulse: { value: 0 },
        },
      });

      const simScene = new THREE.Scene();
      simScene.add(new THREE.Mesh(quadGeo, simMaterial));

      // ── Display quad ─────────────────────────────────────────────────────
      const displayMaterial = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: DISPLAY_FRAG,
        uniforms: {
          u_heightMap: { value: rtB.texture },
          u_video: { value: videoTexture },
          u_res: { value: new THREE.Vector2(W, H) },
          u_baseColor: { value: new THREE.Vector3(...BASE_COLOR) },
          u_refractionScale: { value: REFRACTION_SCALE },
          u_videoOpacity: { value: VIDEO_OPACITY },
          u_coverScale: { value: new THREE.Vector2(1, 1) },
          u_coverOffset: { value: new THREE.Vector2(0, 0) },
        },
      });

      const displayScene = new THREE.Scene();
      displayScene.add(new THREE.Mesh(quadGeo, displayMaterial));

      // ── Cover UV (simulates object-fit: cover for the video) ─────────────
      const setVideoCover = () => {
        if (!videoEl) return;

        // Wait for video to be ready - critical fix
        if (!videoEl.videoWidth || !videoEl.videoHeight) {
          // Video not ready yet, retry in 100ms
          setTimeout(setVideoCover, 100);
          return;
        }

        // Use accurate dimensions - fix for stale values
        const rect = canvas.getBoundingClientRect();
        let cW = rect.width;
        let cH = rect.height;

        // Check for valid canvas dimensions - CRITICAL FIX
        if (cW <= 0 || cH <= 0) {
          // Canvas has no valid dimensions, try parent container as fallback
          const parent = canvas.parentElement;
          if (parent) {
            const parentRect = parent.getBoundingClientRect();
            cW = parentRect.width;
            cH = parentRect.height;
          }

          // If still invalid, retry after layout
          if (cW <= 0 || cH <= 0) {
            setTimeout(setVideoCover, 100);
            return;
          }
        }

        const vAspect = videoEl.videoWidth / videoEl.videoHeight;
        const cAspect = cW / cH;

        let sx = 1,
          sy = 1,
          ox = 0,
          oy = 0;

        if (cAspect > vAspect) {
          // canvas wider: fit video width, crop video height
          sy = vAspect / cAspect;
          oy = (1 - sy) / 2;
        } else {
          // canvas taller: fit video height, crop video width
          sx = cAspect / vAspect;
          ox = (1 - sx) / 2;
        }

        displayMaterial.uniforms.u_coverScale.value.set(sx, sy);
        displayMaterial.uniforms.u_coverOffset.value.set(ox, oy);

        // CRITICAL: Force uniforms update
        displayMaterial.uniformsNeedUpdate = true;
      };

      if (videoEl) {
        if (videoEl.videoWidth) {
          setVideoCover();
        } else {
          videoEl.addEventListener('loadedmetadata', setVideoCover, { once: true });
        }
      }

      // ── Normal-map pass (drives text displacement) ────────────────────────
      const nmRt = new THREE.WebGLRenderTarget(NM_W, NM_H, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });

      const normalMaterial = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: NORMAL_FRAG,
        uniforms: {
          u_heightMap: { value: null },
          u_res: { value: new THREE.Vector2(SIM_W, SIM_H) },
        },
      });

      const normalScene = new THREE.Scene();
      normalScene.add(new THREE.Mesh(quadGeo, normalMaterial));

      // Pixel buffer + 2D canvas for SVG feImage source
      const nmPixels = new Uint8Array(NM_W * NM_H * 4);
      const nmImageData = new ImageData(NM_W, NM_H);

      const dispCanvas = document.createElement('canvas');
      dispCanvas.width = NM_W;
      dispCanvas.height = NM_H;
      dispCanvas.style.cssText =
        'position:absolute;pointer-events:none;visibility:hidden;width:0;height:0;';
      document.body.appendChild(dispCanvas);
      const dispCtx = dispCanvas.getContext('2d');

      // SVG filter applied to hero text content
      const svgNS = 'http://www.w3.org/2000/svg';
      const svgEl = document.createElementNS(svgNS, 'svg');
      svgEl.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      const defs = document.createElementNS(svgNS, 'defs');
      const filterEl = document.createElementNS(svgNS, 'filter');
      filterEl.setAttribute('id', 'water-text-filter');
      // userSpaceOnUse: all coordinates in the element's own pixel space (0,0 = element top-left)
      filterEl.setAttribute('filterUnits', 'userSpaceOnUse');
      filterEl.setAttribute('primitiveUnits', 'userSpaceOnUse');
      filterEl.setAttribute('x', '-100');
      filterEl.setAttribute('y', '-100');
      filterEl.setAttribute('width', '3000');
      filterEl.setAttribute('height', '800');
      filterEl.setAttribute('color-interpolation-filters', 'sRGB');
      const feImage = document.createElementNS(svgNS, 'feImage');
      feImage.setAttribute('result', 'wmap');
      feImage.setAttribute('x', '-100');
      feImage.setAttribute('y', '-100');
      feImage.setAttribute('width', '3000');
      feImage.setAttribute('height', '800');
      feImage.setAttribute('preserveAspectRatio', 'none');
      const feDisp = document.createElementNS(svgNS, 'feDisplacementMap');
      feDisp.setAttribute('in', 'SourceGraphic');
      feDisp.setAttribute('in2', 'wmap');
      feDisp.setAttribute('scale', '6');
      feDisp.setAttribute('xChannelSelector', 'R');
      feDisp.setAttribute('yChannelSelector', 'G');
      filterEl.appendChild(feImage);
      filterEl.appendChild(feDisp);
      defs.appendChild(filterEl);
      svgEl.appendChild(defs);
      document.body.appendChild(svgEl);

      // Inject a <style> tag so no inline styles are touched on DOM elements
      const styleEl = document.createElement('style');
      styleEl.textContent = '.hero_heading { filter: url(#water-text-filter); }';
      document.head.appendChild(styleEl);

      const heroEl = canvas.closest('.hero_wrap') || canvas.parentElement;
      const headingEl = heroEl.querySelector('.hero_heading');

      // Align feImage so displacement canvas maps correctly onto the heading.
      // filterUnits=userSpaceOnUse means coords are in the heading's own pixel space.
      // We offset feImage by -headingOffset so the hero canvas origin aligns with (0,0).
      const updateFilterGeometry = () => {
        if (!headingEl) return;
        const heroRect = heroEl.getBoundingClientRect();
        const headRect = headingEl.getBoundingClientRect();
        const relX = headRect.left - heroRect.left;
        const relY = headRect.top - heroRect.top;
        const W = heroRect.width;
        const H = heroRect.height;
        feImage.setAttribute('x', String(-relX));
        feImage.setAttribute('y', String(-relY));
        feImage.setAttribute('width', String(W));
        feImage.setAttribute('height', String(H));
        filterEl.setAttribute('x', String(-relX - 30));
        filterEl.setAttribute('y', String(-relY - 30));
        filterEl.setAttribute('width', String(W + 60));
        filterEl.setAttribute('height', String(H + 60));
      };
      updateFilterGeometry();

      // ── Tick loop (only runs while there is active ripple energy) ───────────
      const tick = () => {
        if (!mounted) return;
        animationId.current = requestAnimationFrame(tick);

        simMaterial.uniforms.u_prev.value = readTarget.texture;
        renderer.setRenderTarget(writeTarget);
        renderer.render(simScene, orthoCamera);
        simMaterial.uniforms.u_addImpulse.value = 0;

        // Normal-map pass → transfer to displacement canvas for SVG text filter
        normalMaterial.uniforms.u_heightMap.value = writeTarget.texture;
        renderer.setRenderTarget(nmRt);
        renderer.render(normalScene, orthoCamera);
        renderer.readRenderTargetPixels(nmRt, 0, 0, NM_W, NM_H, nmPixels);
        for (let y = 0; y < NM_H; y++) {
          const srcRow = (NM_H - 1 - y) * NM_W * 4; // flip Y (WebGL origin = bottom-left)
          nmImageData.data.set(nmPixels.subarray(srcRow, srcRow + NM_W * 4), y * NM_W * 4);
        }
        dispCtx.putImageData(nmImageData, 0, 0);
        feImage.setAttribute('href', dispCanvas.toDataURL());

        displayMaterial.uniforms.u_heightMap.value = writeTarget.texture;
        renderer.setRenderTarget(null);
        renderer.render(displayScene, orthoCamera);

        const tmp = readTarget;
        readTarget = writeTarget;
        writeTarget = tmp;
      };

      tick();

      // ── Mouse / touch events ─────────────────────────────────────────────
      const handleMouseMove = e => {
        const rect = heroEl.getBoundingClientRect();
        simMaterial.uniforms.u_mouse.value.set(
          (e.clientX - rect.left) / rect.width,
          1.0 - (e.clientY - rect.top) / rect.height
        );
        simMaterial.uniforms.u_radius.value = MOUSE_RADIUS;
        simMaterial.uniforms.u_strength.value = MOUSE_STRENGTH;
        simMaterial.uniforms.u_addImpulse.value = 1;
      };

      const handleTouchMove = e => {
        const touch = e.touches[0];
        const rect = heroEl.getBoundingClientRect();
        simMaterial.uniforms.u_mouse.value.set(
          (touch.clientX - rect.left) / rect.width,
          1.0 - (touch.clientY - rect.top) / rect.height
        );
        simMaterial.uniforms.u_radius.value = MOUSE_RADIUS;
        simMaterial.uniforms.u_strength.value = MOUSE_STRENGTH;
        simMaterial.uniforms.u_addImpulse.value = 1;
      };

      heroEl.addEventListener('mousemove', handleMouseMove, { passive: true });
      heroEl.addEventListener('touchmove', handleTouchMove, { passive: true });

      // ── Resize ────────────────────────────────────────────────────────────
      let resizeTimeout = null;
      let resizeRafId = null;

      const handleResize = () => {
        if (!mounted) return;

        // Clear any pending resize operations
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
          resizeTimeout = null;
        }
        if (resizeRafId) {
          cancelAnimationFrame(resizeRafId);
          resizeRafId = null;
        }

        // Debounce resize events - increased to ensure CSS/media queries are applied
        resizeTimeout = setTimeout(() => {
          // Use requestAnimationFrame to ensure layout is recalculated
          resizeRafId = requestAnimationFrame(() => {
            if (!mounted) return;

            // Get accurate dimensions using getBoundingClientRect
            const rect = canvas.getBoundingClientRect();
            const W2 = Math.floor(rect.width);
            const H2 = Math.floor(rect.height);

            // Skip resize if canvas has no valid dimensions - CRITICAL FIX
            if (W2 <= 0 || H2 <= 0) {
              return;
            }

            const SW = Math.floor(W2 / 2);
            const SH = Math.floor(H2 / 2);

            // Only resize if dimensions actually changed
            const currentWidth = renderer.getSize(new THREE.Vector2()).x;
            const currentHeight = renderer.getSize(new THREE.Vector2()).y;

            if (Math.abs(W2 - currentWidth) > 1 || Math.abs(H2 - currentHeight) > 1) {
              renderer.setSize(W2, H2, false);

              rtA.dispose();
              rtB.dispose();
              rtA = new THREE.WebGLRenderTarget(SW, SH, rtOptions);
              rtB = new THREE.WebGLRenderTarget(SW, SH, rtOptions);
              readTarget = rtA;
              writeTarget = rtB;

              renderer.setRenderTarget(rtA);
              renderer.clear();
              renderer.setRenderTarget(rtB);
              renderer.clear();
              renderer.setRenderTarget(null);

              simMaterial.uniforms.u_res.value.set(SW, SH);
              displayMaterial.uniforms.u_res.value.set(W2, H2);
              setVideoCover();
              updateFilterGeometry();

              // Force uniforms update for all materials
              displayMaterial.uniformsNeedUpdate = true;
              simMaterial.uniformsNeedUpdate = true;
            }
          });
        }, 250); // Increased to 250ms for better CSS/media query handling
      };

      window.addEventListener('resize', handleResize);

      // Also add ResizeObserver for more precise container size tracking
      let resizeObserver = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvas);
      }

      // ── Visibility pause (no auto-resume — user must move mouse again) ──────
      const handleVisibility = () => {
        if (document.hidden) {
          if (animationId.current) cancelAnimationFrame(animationId.current);
          animationId.current = null;
        } else if (mounted) {
          tick();
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);

      // ── WebGL context loss/restore ────────────────────────────────────────
      const handleContextLost = e => {
        e.preventDefault();
        if (animationId.current) cancelAnimationFrame(animationId.current);
        animationId.current = null;
      };

      const handleContextRestored = () => {
        if (mounted) init();
      };

      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      // ── Cleanup ───────────────────────────────────────────────────────────
      cleanupRef.current = () => {
        heroEl.removeEventListener('mousemove', handleMouseMove);
        heroEl.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibility);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);

        // Clean up resize handlers
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
          resizeTimeout = null;
        }
        if (resizeRafId) {
          cancelAnimationFrame(resizeRafId);
          resizeRafId = null;
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        styleEl.parentNode?.removeChild(styleEl);
        if (svgEl.parentNode) svgEl.parentNode.removeChild(svgEl);
        if (dispCanvas.parentNode) dispCanvas.parentNode.removeChild(dispCanvas);
        nmRt.dispose();
        normalMaterial.dispose();
        if (videoBgWrapper) videoBgWrapper.style.visibility = '';
        if (videoTexture) videoTexture.dispose();
        rtA.dispose();
        rtB.dispose();
        simMaterial.dispose();
        displayMaterial.dispose();
        quadGeo.dispose();
        renderer.dispose();
      };
    };

    // Lazy-init via IntersectionObserver (hero is above fold — fires immediately)
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          init();
          observer.disconnect();
        }
      },
      { rootMargin: '0px' }
    );

    observer.observe(canvas);

    return () => {
      mounted = false;
      observer.disconnect();
      if (animationId.current) cancelAnimationFrame(animationId.current);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [canvasId]);
}
