// 3D ARG mark used on the 404 city. The lower bar ends before the top; the square foot
// continues to the same right edge so top and (bar + foot) match.
const PARTS = [
  { w: 5, h: 2, d: 1.2, x: 6, y: 3, z: 0.01, mix: 0 },
  { w: 3.5, h: 2, d: 1.2, x: 1.75, y: 1, z: 0.02, mix: 0.25 },
  { w: 5, h: 2, d: 1.2, x: 4, y: -1, z: 0.04, mix: 0.75 },
  { w: 2, h: 2, d: 1.2, x: 7.5, y: -3, z: 0.05, mix: 1 },
];

export function createArgMark({
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Color,
  primary,
  secondary,
}) {
  const group = new Group();
  const from = new Color(primary);
  const to = new Color(secondary);

  PARTS.forEach(part => {
    const color = from.clone().lerp(to, part.mix);
    const mesh = new Mesh(
      new BoxGeometry(part.w, part.h, part.d),
      new MeshStandardMaterial({
        color,
        emissive: color,
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
    mesh.position.set(part.x, part.y, part.z);
    group.add(mesh);
  });

  let minX = Infinity;
  let maxX = -Infinity;
  group.children.forEach(mesh => {
    minX = Math.min(minX, mesh.position.x - mesh.geometry.parameters.width / 2);
    maxX = Math.max(maxX, mesh.position.x + mesh.geometry.parameters.width / 2);
  });
  const shift = (minX + maxX) / 2;
  group.children.forEach(mesh => {
    mesh.position.x -= shift;
  });

  return group;
}
