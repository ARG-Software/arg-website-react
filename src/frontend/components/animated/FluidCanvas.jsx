import { useEffect, useRef } from 'react';
import {
  FLUID_FRAGMENT_SHADER,
  FLUID_VERTEX_SHADER,
  MAX_BALLS,
} from '../../animations/shaders/fluidBlob';

const STILL_FRAME_SECONDS = 3;
// The camera sits 3.2 units back with a focal length of 2.2, so one unit of screen space
// (half the shorter canvas side) covers this much of the plane the blob floats on.
const SCREEN_TO_WORLD = 3.2 / 2.2;
const REACH_RANGE = 4;
const FOLLOW_EASE = 0.08;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * Decorative liquid blob drawn with WebGL. `balls(seconds)` returns the spheres that melt
 * together, as [x, y, z, radius] in a view about 2.9 units tall; `melt` sets how strongly
 * they flow into each other. The blob leans towards the pointer and stretches a drop out to
 * meet it; that only moves the spheres already sent each frame, so it adds no rendering
 * work. The loop only runs while the canvas is on screen; reduced motion gets one still frame.
 */
export function FluidCanvas({ balls, melt = 0.35, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true });
    if (!gl) return undefined;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, FLUID_VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FLUID_FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    // One triangle that covers the whole canvas
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = name => gl.getUniformLocation(program, name);
    gl.uniform1f(uniform('uMelt'), melt);
    const resolution = uniform('uResolution');
    const time = uniform('uTime');
    const ballsUniform = uniform('uBalls');
    const count = uniform('uCount');
    const packed = new Float32Array(MAX_BALLS * 4);
    // Pointer target in world units, and the eased point and strength that follow it
    const pointer = { x: 0, y: 0, active: false };
    const reach = { x: 0, y: 0, strength: 0 };

    const withPointer = spheres => {
      reach.x += (pointer.x - reach.x) * FOLLOW_EASE;
      reach.y += (pointer.y - reach.y) * FOLLOW_EASE;
      reach.strength += ((pointer.active ? 1 : 0) - reach.strength) * FOLLOW_EASE;
      if (reach.strength < 0.01) return spheres;

      const centreX = spheres.reduce((sum, sphere) => sum + sphere[0], 0) / spheres.length;
      const centreY = spheres.reduce((sum, sphere) => sum + sphere[1], 0) / spheres.length;
      const dx = reach.x - centreX;
      const dy = reach.y - centreY;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = reach.strength * Math.max(0, 1 - distance / REACH_RANGE);
      const nx = dx / distance;
      const ny = dy / distance;
      const leaned = spheres.map(([x, y, z, radius]) => [
        x + nx * 0.12 * pull,
        y + ny * 0.12 * pull,
        z,
        radius,
      ]);
      // Two spheres out from the centre melt into a neck that stretches towards the pointer;
      // the neck shortens as the pull weakens, so the tip never breaks off
      const reachLength = Math.min(distance, 0.9) * (0.4 + 0.6 * pull) * reach.strength;
      if (leaned.length + 2 > MAX_BALLS) return leaned;
      leaned.push([
        centreX + nx * reachLength * 0.55,
        centreY + ny * reachLength * 0.55,
        0.15,
        0.22 * reach.strength,
      ]);
      leaned.push([
        centreX + nx * reachLength,
        centreY + ny * reachLength,
        0.2,
        0.17 * reach.strength,
      ]);
      return leaned;
    };

    const paint = seconds => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, seconds);
      const spheres = withPointer(balls(seconds)).slice(0, MAX_BALLS);
      spheres.forEach((sphere, i) => packed.set(sphere, i * 4));
      gl.uniform4fv(ballsUniform, packed);
      gl.uniform1f(count, spheres.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let start = 0;
    let visible = false;

    const step = now => {
      if (!start) start = now;
      paint((now - start) / 1000);
      frame = requestAnimationFrame(step);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      if (reducedMotion) paint(STILL_FRAME_SECONDS);
      else if (visible && !document.hidden) frame = requestAnimationFrame(step);
    };

    // Listen on the whole header, since the text sits above the canvas
    const area = canvas.closest('header') ?? canvas.parentElement;
    const onPointerMove = event => {
      const rect = canvas.getBoundingClientRect();
      const unit = Math.min(rect.width, rect.height) / 2;
      pointer.x = ((event.clientX - rect.left - rect.width / 2) / unit) * SCREEN_TO_WORLD;
      pointer.y = ((rect.height / 2 - (event.clientY - rect.top)) / unit) * SCREEN_TO_WORLD;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    area.addEventListener('pointermove', onPointerMove, { passive: true });
    area.addEventListener('pointerleave', onPointerLeave);

    const resize = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(entry.contentRect.width * dpr);
      canvas.height = Math.round(entry.contentRect.height * dpr);
      paint(start ? (performance.now() - start) / 1000 : STILL_FRAME_SECONDS);
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    resize.observe(canvas);
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      area.removeEventListener('pointermove', onPointerMove);
      area.removeEventListener('pointerleave', onPointerLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [balls, melt]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
