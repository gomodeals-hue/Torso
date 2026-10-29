import fs from 'fs';

function inspectGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.toString('utf8', 0, 4);
  if (magic !== 'glTF') {
    console.log(filePath, 'not gltf');
    return;
  }
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log(`\n=== ${filePath} ===`);
  console.log('Meshes:', gltf.meshes?.map(m => m.name));
  console.log('Nodes:', gltf.nodes?.map(n => n.name));
  console.log('Materials:', gltf.materials?.map(m => m.name));
  if (gltf.accessors && gltf.accessors.length > 0) {
    const posAccessors = gltf.accessors.filter(a => a.type === 'VEC3' && a.min && a.max);
    console.log('Position bounding box min/max:', posAccessors.slice(0, 3).map(a => ({ min: a.min, max: a.max })));
  }
}

inspectGlb('public/models/tshirt.glb');
inspectGlb('public/models/long_sleeve.glb');
inspectGlb('public/models/polo.glb');
