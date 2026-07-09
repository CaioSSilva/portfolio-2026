import * as THREE from 'three';
import { CameraAnimations } from '../services/camera-animations';

export interface InteractableConfig {
  rootObject: THREE.Object3D;
  distinct: boolean;
}

export abstract class InteractableFeature {
  abstract matches(objectName: string): boolean;
  abstract setup(scene: THREE.Scene, cameraAnimations: CameraAnimations, cssScene?: THREE.Scene): void;
  abstract onClick(object: THREE.Object3D, cameraAnimations: CameraAnimations): void;
  abstract returnToIdle?(cameraAnimations: CameraAnimations): void;
}