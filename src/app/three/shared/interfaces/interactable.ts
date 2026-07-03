import * as THREE from 'three'

export interface InteractableConfig {
  rootObject: THREE.Object3D;
  distinct: boolean;
}