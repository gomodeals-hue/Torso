import fs from 'fs';

function inspectNodes(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log(`\n=== Nodes in ${filePath} ===`);
  gltf.nodes.forEach((node, i) => {
    console.log(`Node ${i}: "${node.name}" matrix:`, node.matrix, 'rotation:', node.rotation, 'translation:', node.translation, 'scale:', node.scale);
  });
}

inspectNodes('public/models/tshirt.glb');
inspectNodes('public/models/long_sleeve.glb');
inspectNodes('public/models/polo.glb');
