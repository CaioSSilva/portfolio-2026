import { inject, Service, effect } from '@angular/core';
import { InteractableFeature } from '../../interfaces/interactable';
import { InteractiveObjects } from '../interactive-objects';
import { MonitorScreen } from '../monitor-screen';
import { CameraAnimations } from '../camera-animations';
import * as THREE from 'three';
import { Pc } from './pc';

@Service()
export class Monitor extends InteractableFeature {
  private monitorScreen = inject(MonitorScreen);
  private interactiveService = inject(InteractiveObjects);
  private pc = inject(Pc);

  private monitorMesh?: THREE.Mesh;
  private monitorTelaMesh?: THREE.Mesh;
  private screenElement?: HTMLElement;

  constructor() {
    super();

    effect(() => {
      const isOn = this.pc.isTurnedOn();

      if (this.monitorMesh) {
        this.monitorMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.raycast = isOn ? THREE.Mesh.prototype.raycast : () => {};
          }
        });
      }
    });
  }

  matches(objectName: string): boolean {
    return objectName === 'Monitor' && this.pc.isTurnedOn();
  }

  setup(scene: THREE.Scene, _cameraAnimations: CameraAnimations, cssScene?: THREE.Scene): void {
    this.monitorMesh = scene.getObjectByName('Monitor') as THREE.Mesh;
    this.monitorTelaMesh = scene.getObjectByName('Monitor_Tela') as THREE.Mesh;

    if (this.monitorTelaMesh) {
      const { cssObject, ghostPlane } = this.monitorScreen.setupMonitorScreen(
        this.monitorTelaMesh,
        'https://portfolio-caios.vercel.app/',
      );

      this.screenElement = cssObject.element as HTMLElement;
      if (this.screenElement) this.screenElement.style.pointerEvents = 'none';
      if (cssScene) cssScene.add(cssObject);
      scene.add(ghostPlane);
    }

    if (this.monitorMesh) {
      this.interactiveService.addObject(this.monitorMesh);

      const isOn = this.pc.isTurnedOn();
      this.monitorMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.raycast = isOn ? THREE.Mesh.prototype.raycast : () => {};
        }
      });
    }
  }

  onClick(object: THREE.Object3D, cameraAnimations: CameraAnimations): void {
    this.interactiveService.enabled = false;
    cameraAnimations.safeFocusOnObject(
      object,
      1.5,
      undefined,
      this.monitorTelaMesh,
      this.screenElement,
    );
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    cameraAnimations.returnToIdle();
  }
}
