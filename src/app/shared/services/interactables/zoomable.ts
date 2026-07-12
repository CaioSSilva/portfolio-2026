import { inject, Service, signal } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { CameraAnimations } from '../camera-animations';
import { InteractiveObjects } from '../interactive-objects';
import { CameraStates } from '../../interfaces/camera';
import { getModelMetadata, ModelMetadata, MODELS_MAPPER } from '../../utils/models.mapper';
import { InteractableFeature } from '../../interfaces/interactable';
import { SoundingSystem } from '../sounding-system';
import { Keyboard } from './keyboard';

@Service()
export class Zoomable extends InteractableFeature {
  private interactiveService = inject(InteractiveObjects);
  private sound = inject(SoundingSystem);
  private keyboard = inject(Keyboard)
  private mainScene!: THREE.Scene;

  public activeObject = signal<THREE.Object3D | null>(null);
  public activeMetadata = signal<ModelMetadata | null>(null);
  public isFullyFocused = signal<boolean>(false);

  matches(objectName: string): boolean {
    return !!MODELS_MAPPER[objectName];
  }

  setup(scene: THREE.Scene, _cameraAnimations: CameraAnimations, _cssScene?: THREE.Scene): void {
    this.mainScene = scene;
    scene.traverse((child) => {
      if (this.matches(child.name)) {
        this.interactiveService.addObject(child);
        child.userData['originalPosition'] = child.position.clone();
        child.userData['originalRotation'] = child.rotation.clone();
        child.userData['originalScale'] = child.scale.clone();
      }
    });
  }

  onClick(object: THREE.Object3D, cameraAnimations: CameraAnimations): void {
    if (cameraAnimations.state() === CameraStates.FREE_ROAM) {
      cameraAnimations.resetFromFreeRoam(() => {
        this.zoom(object, cameraAnimations);
      });
    } else this.zoom(object, cameraAnimations);
  }

  zoom(object: THREE.Object3D, cameraAnimations: CameraAnimations) {
    this.interactiveService.enabled = false;
    this.keyboard.ngOnDestroy()
    cameraAnimations.state.set(CameraStates.TRANSITIONING);

    this.activeObject.set(object);
    this.activeMetadata.set(getModelMetadata(object.name) ?? null);

    const box = new THREE.Box3().setFromObject(object);
    const worldCenter = new THREE.Vector3();
    box.getCenter(worldCenter);

    const pivotContainer = new THREE.Group();
    pivotContainer.name = `Pivot_${object.name}`;

    this.mainScene.add(pivotContainer);
    pivotContainer.position.copy(worldCenter);

    object.userData['originalParent'] = object.parent;
    object.userData['initContainerPos'] = pivotContainer.position.clone();

    pivotContainer.attach(object);
    object.userData['pivotContainer'] = pivotContainer;

    const camera = (cameraAnimations as any).threeApp.camera;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const targetWorldPosition = camera.position.clone().add(direction.clone().multiplyScalar(2.5));

    const overlayGeo = new THREE.PlaneGeometry(100, 100);
    const overlayMat = new THREE.MeshBasicMaterial({
      color: 0x0f0f14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const webglOverlay = new THREE.Mesh(overlayGeo, overlayMat);
    const overlayTarget = camera.position.clone().add(direction.clone().multiplyScalar(4.0));

    webglOverlay.position.copy(overlayTarget);
    webglOverlay.lookAt(camera.position);

    this.mainScene.add(webglOverlay);
    object.userData['webglOverlay'] = webglOverlay;

    this.mainScene.updateMatrixWorld();
    this.mainScene.worldToLocal(targetWorldPosition);

    gsap.to(overlayMat, {
      opacity: 0.85,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    this.sound.playCameraTransition(1.2, 'in');

    gsap.to(pivotContainer.position, {
      x: targetWorldPosition.x,
      y: targetWorldPosition.y,
      z: targetWorldPosition.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => {
        cameraAnimations.state.set(CameraStates.FOCUSED);
        this.isFullyFocused.set(true);
      },
    });

    gsap.to(pivotContainer.scale, {
      x: 8,
      y: 8,
      z: 8,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    gsap.to(pivotContainer.rotation, {
      y: pivotContainer.rotation.y + Math.PI * 2,
      duration: 1.2,
      ease: 'power2.inOut',
    });
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    const obj = this.activeObject();
    if (!obj) return;

    cameraAnimations.state.set(CameraStates.TRANSITIONING);
    this.isFullyFocused.set(false);

    const pivotContainer = obj.userData['pivotContainer'] as THREE.Group;
    const webglOverlay = obj.userData['webglOverlay'] as THREE.Mesh;
    const originalParent = obj.userData['originalParent'] as THREE.Object3D;
    const initContainerPos = obj.userData['initContainerPos'] as THREE.Vector3;

    const origPos = obj.userData['originalPosition'];
    const origRot = obj.userData['originalRotation'];
    const origScale = obj.userData['originalScale'];

    if (webglOverlay) {
      gsap.to(webglOverlay.material as THREE.Material, {
        opacity: 0,
        duration: 1.0,
        ease: 'power2.inOut',
        onComplete: () => {
          this.mainScene.remove(webglOverlay);
          webglOverlay.geometry.dispose();
          (webglOverlay.material as THREE.Material).dispose();
        },
      });
    }

    this.sound.playCameraTransition(1, 'out');

    if (pivotContainer) {
      gsap.to(pivotContainer.position, {
        x: initContainerPos.x,
        y: initContainerPos.y,
        z: initContainerPos.z,
        duration: 1.0,
        ease: 'power2.inOut',
      });

      gsap.to(pivotContainer.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.0,
        ease: 'power2.inOut',
      });

      gsap.to(pivotContainer.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.0,
        ease: 'power2.inOut',
        onComplete: () => {
          originalParent.attach(obj);
          obj.position.copy(origPos);
          obj.rotation.copy(origRot);
          obj.scale.copy(origScale);

          pivotContainer.parent?.remove(pivotContainer);

          this.activeObject.set(null);
          this.activeMetadata.set(null);
          cameraAnimations.state.set(CameraStates.IDLE);
          this.keyboard.restart()
          this.interactiveService.enabled = true;
        },
      });
    }
  }
}
