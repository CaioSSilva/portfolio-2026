import { inject, Service } from '@angular/core';
import { InteractableFeature } from '../../interfaces/interactable';
import { InteractiveObjects } from '../interactive-objects';
import { MonitorScreen } from '../monitor-screen';
import { CameraAnimations } from '../camera-animations';
import * as THREE from 'three';

@Service()
export class Monitor extends InteractableFeature {
private monitorScreen = inject(MonitorScreen);
  private interactiveService = inject(InteractiveObjects);
  private monitorTelaMesh?: THREE.Mesh;
  private screenElement?: HTMLElement;

  matches(objectName: string): boolean {
    return objectName === 'Monitor';
  }

  setup(scene: THREE.Scene, cameraAnimations: CameraAnimations, cssScene?: THREE.Scene): void {
    const monitorMesh = scene.getObjectByName('Monitor') as THREE.Mesh;
    this.monitorTelaMesh = scene.getObjectByName('Monitor_Tela') as THREE.Mesh;

    if (this.monitorTelaMesh) {
      const { cssObject, ghostPlane } = this.monitorScreen.setupMonitorScreen(
        this.monitorTelaMesh,
        'https://portfolio-caios.vercel.app/'
      );

      this.screenElement = cssObject.element as HTMLElement;
      if (this.screenElement) this.screenElement.style.pointerEvents = 'none';
      if (cssScene) cssScene.add(cssObject);
      scene.add(ghostPlane);
    }

    if (monitorMesh) {
      this.interactiveService.addObject(monitorMesh);
    }
  }

  onClick(object: THREE.Object3D, cameraAnimations: CameraAnimations): void {
    this.interactiveService.enabled = false;
    cameraAnimations.safeFocusOnObject(object, 1.5, undefined, this.monitorTelaMesh, this.screenElement);
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    cameraAnimations.returnToIdle();
  }
}