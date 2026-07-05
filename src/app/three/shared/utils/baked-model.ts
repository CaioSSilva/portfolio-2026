import * as THREE from 'three';

function resolveTextureName(mesh: THREE.Object3D): string {
  let current: THREE.Object3D | null = mesh;
  while (current) {
    if (current.name) return normalizeMeshName(current.name);
    current = current.parent;
  }
  return '';
}

function normalizeMeshName(name: string): string {
  return name.replace(/\.\d+$/, '').replace(/_\d+$/, '');
}

export async function applyBakedTextures(
  modelScene: THREE.Group,
  textureLoader: THREE.TextureLoader,
  textureBasePath: string,
  scale = 1,
): Promise<THREE.Group> {
  const meshNames = new Set<string>();

  modelScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshNames.add(resolveTextureName(child));
      console.log('mesh.name:', child.name, '| resolved:', resolveTextureName(child));
    }
  });

  const textureCache = new Map<string, THREE.Texture>();

  await Promise.all(
    Array.from(meshNames).map(async (name) => {
      try {
        const texture = await textureLoader.loadAsync(`${textureBasePath}/${name}.png`);
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(name, texture);
      } catch {
        textureCache.set(name, null as any);
      }
    }),
  );

  modelScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.scale.set(scale, scale, scale);
      const texture = textureCache.get(resolveTextureName(child));
      child.material = texture
        ? new THREE.MeshBasicMaterial({ map: texture })
        : child.material
    }
  });

  return modelScene;
}
