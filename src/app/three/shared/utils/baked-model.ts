import * as THREE from 'three';

export function applyBakedTexture(
  modelScene: THREE.Group,
  texture: THREE.Texture | null = null,
  scale = 1
): THREE.Group {
  
  if (texture) {
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });

    modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.scale.set(scale, scale, scale);
        child.material = material;
      }
    });

  } else {
    modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.scale.set(scale, scale, scale);
        
        if (child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
        }
      }
    });
  }
  return modelScene;
}