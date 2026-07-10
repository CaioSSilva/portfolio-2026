import { inject, Service, signal } from '@angular/core';
import * as THREE from 'three';
import { InteractableFeature } from '../../interfaces/interactable';
import { CameraAnimations } from '../camera-animations';
import { InteractiveObjects } from '../interactive-objects';

@Service()
export class Xbox extends InteractableFeature {
  private interactiveObjects = inject(InteractiveObjects);

  public isXboxOn = signal(true)

  private readonly XBOX_NAME = 'Xbox_One';

  matches(objectName: string): boolean {
    return objectName === this.XBOX_NAME;
  }

  setup(
    scene: THREE.Scene,
    _cameraAnimations: CameraAnimations,
    _cssScene?: THREE.Scene
  ): void {
    const xbox = scene.getObjectByName(this.XBOX_NAME);

    if (xbox) {
      this.interactiveObjects.addObject(xbox);
    }
  }

  onClick(
    _object: THREE.Object3D,
    _cameraAnimations: CameraAnimations
  ): void {
   
    
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    cameraAnimations.returnToIdle();
  }
}