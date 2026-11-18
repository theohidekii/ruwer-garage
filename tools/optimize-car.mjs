// (as normais são removidas e recalculadas no navegador com computeVertexNormals, porque o original não compartilha vértices entre triângulos)
// Otimiza o .glb do carro para a web: remove UVs (o modelo não tem texturas), solda vértices,
// simplifica a malha, junta peças por material e quantiza os vértices (sem depender de decodificador extra no navegador).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, join, flatten, quantize, meshopt, reorder, normals } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [,, src, dst, ratio = '0.2', error = '0.01'] = process.argv;
await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives())
  for (const s of prim.listSemantics()) if (s.startsWith('TEXCOORD') || s.startsWith('COLOR') || s === 'TANGENT' || s === 'NORMAL') prim.setAttribute(s, null);
await doc.transform(
  dedup(), flatten(), join({ keepNamed: false }), weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +error, lockBorder: false }),
  prune(), reorder({ encoder: MeshoptEncoder }), quantize()
);
await io.write(dst, doc);
