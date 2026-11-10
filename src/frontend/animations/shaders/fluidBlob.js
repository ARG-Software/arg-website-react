// Glossy white-grey liquid blob, in the look of the intro video: spheres melted together
// with a smooth union, raymarched, lit with a soft key light, two sharp highlights and a
// fresnel rim. The background stays transparent so the page colour shows through.
export const MAX_BALLS = 8;

export const FLUID_VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FLUID_FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uBalls[${MAX_BALLS}];
uniform float uCount;
uniform float uMelt;
uniform vec3 uColour;
// 1 for a soft studio look: lit by a matcap (a picture of a lit sphere) seen through a long lens
// from 6 units back, with tighter creases between the spheres
uniform float uMatte;
uniform sampler2D uMatcap;
// Where the long-lens camera sits, in x and y; it always looks at the centre, so moving it tilts
// the view
uniform vec2 uCamera;

float smoothUnion(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// An exponential smooth union: its creases stay tight where spheres meet and it blends any
// number of them in any order the same way
float softUnion(float a, float b, float k) {
  return -k * log2(exp2(-a / k) + exp2(-b / k));
}

float field(vec3 p) {
  float d = 100.0;
  for (int i = 0; i < ${MAX_BALLS}; i++) {
    if (float(i) >= uCount) break;
    vec4 ball = uBalls[i];
    float sphere = length(p - ball.xyz) - ball.w;
    if (uMatte > 0.5) d = softUnion(d, sphere, uMelt);
    else d = smoothUnion(d, sphere, uMelt);
  }
  // A slow ripple over the surface so it never looks rigid; the studio body stays smooth
  d += (1.0 - uMatte) * 0.012 * sin(p.x * 7.0 + uTime * 1.3) * sin(p.y * 6.0 - uTime) * sin(p.z * 5.0 + uTime * 0.7);
  return d;
}

vec3 surfaceNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    field(p + e.xyy) - field(p - e.xyy),
    field(p + e.yxy) - field(p - e.yxy),
    field(p + e.yyx) - field(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  // Both cameras see about 2.9 units across the shorter side at the centre plane; the studio
  // one sits further back with a longer lens, so the spheres keep their round shape
  float focal = 2.2;
  float far = 6.0;
  vec3 origin = vec3(0.0, 0.0, 3.2);
  vec3 ray = normalize(vec3(uv, -focal));
  if (uMatte > 0.5) {
    focal = 4.087;
    far = 12.0;
    origin = vec3(uCamera, 6.0);
    vec3 forward = normalize(-origin);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    ray = normalize(forward * focal + right * uv.x + up * uv.y);
  }

  // The closest the ray came to the surface, and where, so a ray that only just misses can
  // still cover part of its pixel: that softens the outline instead of leaving it jagged
  float travelled = 0.0;
  float closest = 100.0;
  float closestAt = 0.0;
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    float d = field(origin + ray * travelled);
    if (d < closest) {
      closest = d;
      closestAt = travelled;
    }
    if (d < 0.001) {
      hit = true;
      break;
    }
    travelled += d;
    if (travelled > far) break;
  }

  float coverage = 1.0;
  if (!hit) {
    // Width of one pixel on the plane where the ray passed closest
    float pixel = closestAt * 2.0 / (min(uResolution.x, uResolution.y) * focal);
    coverage = 1.0 - smoothstep(0.0, pixel * 1.5, closest);
    if (coverage <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    travelled = closestAt;
  }

  vec3 p = origin + ray * travelled;
  vec3 n = surfaceNormal(p);
  vec3 view = -ray;
  vec3 key = normalize(vec3(-0.5, 0.8, 0.6));
  vec3 fill = normalize(vec3(0.7, -0.2, 0.5));
  float facing = max(dot(n, view), 0.0);
  float fresnel = pow(1.0 - facing, 3.0);

  if (uMatte > 0.5) {
    // Colour from the matcap at the reflected view, then a depth boost so faces nearer the
    // camera stay luminous, drawn at 90% so a little of the page shows through
    vec3 reflected = reflect(ray, n);
    float m = 2.8284271 * sqrt(reflected.z + 1.0);
    float depth = clamp((1.0 - pow(travelled, 1.1) / 45.0) * 1.2, 0.0, 1.0);
    vec3 studio = texture2D(uMatcap, reflected.xy / m + 0.5).rgb * depth;
    float alpha = 0.9 * coverage;
    gl_FragColor = vec4(studio * alpha, alpha);
    return;
  }

  // Soft white-grey by default, so the pieces sit quietly on the navy header
  vec3 colour = uColour * (0.55 + 0.45 * dot(n, key));
  // Reflected surroundings: the navy page below, soft light above
  vec3 reflected = reflect(-view, n);
  vec3 surroundings = mix(vec3(0.05, 0.0, 0.18), vec3(1.0), smoothstep(-0.2, 0.9, reflected.y));
  colour = mix(colour, surroundings, fresnel * 0.6);
  colour += pow(max(dot(reflect(-key, n), view), 0.0), 60.0) * 1.1;
  colour += pow(max(dot(reflect(-fill, n), view), 0.0), 24.0) * 0.35;

  // Premultiplied, as the canvas expects
  gl_FragColor = vec4(colour * coverage, coverage);
}
`;
