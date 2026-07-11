import { inject, Service, NgZone, signal } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { ThreeApplication } from './three-application';
import { CameraStates } from '../interfaces/camera';
import { InteractiveObjects } from './interactive-objects';
import { SoundingSystem } from './sounding-system';

@Service()
export class CameraAnimations {
  private threeApp = inject(ThreeApplication);
  private interactiveService = inject(InteractiveObjects);
  private ngZone = inject(NgZone);
  private sound = inject(SoundingSystem);

  public state = signal<CameraStates>(CameraStates.IDLE);

  private baseCameraPos = new THREE.Vector3();
  private baseTargetPos = new THREE.Vector3();

  private currentScreenElement?: HTMLElement;
  private hoverExitTimeout: number | null = null;

  private readonly HOVER_EXIT_DELAY = 800;
  private readonly DURATION_FOCUS = 1.5;
  private readonly DURATION_RESET = 1.2;
  private readonly SAFE_DISTANCE = 0.5;

  public initIdle(cameraPos: THREE.Vector3, targetPos: THREE.Vector3): void {
    this.baseCameraPos.copy(cameraPos);
    this.baseTargetPos.copy(targetPos);
    this.startIdle();
  }

  public startIdle(): void {
    this.state.set(CameraStates.IDLE);

    if (this.threeApp.controls) {
      this.threeApp.controls.enabled = false;
      this.threeApp.controls.target.copy(this.baseTargetPos);
      this.threeApp.controls.update();
    }

    this.threeApp.camera.position.copy(this.baseCameraPos);
    this.threeApp.camera.lookAt(this.baseTargetPos);
  }

  public update(): void {
    if (this.state() === CameraStates.IDLE) {
      this.threeApp.camera.position.copy(this.baseCameraPos);
      this.threeApp.camera.lookAt(this.baseTargetPos);
    }
  }

  public safeFocusOnObject(
    targetObject: THREE.Object3D,
    fillRatio: number = 0.6,
    onComplete?: () => void,
    referenceMesh?: THREE.Mesh,
    screenElement?: HTMLElement,
  ): void {
    const currentState = this.state();

    if (currentState === CameraStates.TRANSITIONING) return;

    if (currentState === CameraStates.IDLE) {
      this.focusOnObject(targetObject, fillRatio, onComplete, referenceMesh, screenElement);
    } else if (currentState === CameraStates.FREE_ROAM) {
      this.resetFromFreeRoam(() =>
        this.focusOnObject(targetObject, fillRatio, onComplete, referenceMesh, screenElement),
      );
    } else if (currentState === CameraStates.FOCUSED) {
      this.returnToIdle(() =>
        this.focusOnObject(targetObject, fillRatio, onComplete, referenceMesh, screenElement),
      );
    }
  }

  public focusOnObject(
    targetObject: THREE.Object3D,
    fillRatio: number = 0.6,
    onComplete?: () => void,
    referenceMesh?: THREE.Mesh,
    screenElement?: HTMLElement,
  ): void {
    if (this.state() === CameraStates.TRANSITIONING) return;
    this.state.set(CameraStates.TRANSITIONING);

    this.currentScreenElement = screenElement;
    if (this.threeApp.controls) this.threeApp.controls.enabled = false;

    const focusData = this.calculateFocusData(targetObject, referenceMesh, fillRatio);

    this.sound.playCameraTransition(this.DURATION_FOCUS, 'in');

    this.animateCamera(
      focusData.cameraPos,
      focusData.targetPos,
      focusData.zoom,
      this.DURATION_FOCUS,
      () => {
        this.state.set(CameraStates.FOCUSED);
        this.setupScreenGuard(screenElement);
        if (onComplete) onComplete();
      },
    );
  }

  public returnToIdle(onCompleteCallback?: () => void): void {
    if (this.state() !== CameraStates.FOCUSED) return;

    this.sound.playCameraTransition(this.DURATION_RESET, 'out');
    this.executeResetTransition(onCompleteCallback);
  }

  public startFreeRoam(): void {
    if (this.state() === CameraStates.TRANSITIONING) return;

    this.state.set(CameraStates.FREE_ROAM);
    if (this.threeApp.controls) {
      this.threeApp.controls.enabled = true;
    }
  }

  public resetFromFreeRoam(onCompleteCallback?: () => void): void {
    if (this.state() !== CameraStates.FREE_ROAM) return;
    this.executeResetTransition(onCompleteCallback);
  }

  private executeResetTransition(onCompleteCallback?: () => void): void {
    this.state.set(CameraStates.TRANSITIONING);
    if (this.threeApp.controls) this.threeApp.controls.enabled = false;

    this.animateCamera(this.baseCameraPos, this.baseTargetPos, 1, this.DURATION_RESET, () => {
      this.clearScreenGuard();
      this.startIdle();

      if (onCompleteCallback) {
        onCompleteCallback();
      } else {
        this.interactiveService.enabled = true;
      }
    });
  }

  private animateCamera(
    targetCameraPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    targetZoom: number,
    duration: number,
    onComplete: () => void,
  ): void {
    const camera = this.threeApp.camera as THREE.OrthographicCamera | THREE.PerspectiveCamera;
    const controls = this.threeApp.controls;

    gsap.to(camera.position, {
      x: targetCameraPos.x,
      y: targetCameraPos.y,
      z: targetCameraPos.z,
      duration,
      ease: 'power2.inOut',
    });

    gsap.to(camera, {
      zoom: targetZoom,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => camera.updateProjectionMatrix(),
    });

    if (controls) {
      gsap.to(controls.target, {
        x: targetLookAt.x,
        y: targetLookAt.y,
        z: targetLookAt.z,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(controls.target),
        onComplete: () => {
          this.ngZone.run(() => {
            controls.update();
            onComplete();
          });
        },
      });
    }
  }

  private calculateFocusData(
    targetObject: THREE.Object3D,
    referenceMesh?: THREE.Mesh,
    fillRatio: number = 0.6,
  ) {
    const focusTarget = referenceMesh ?? targetObject;
    const box = new THREE.Box3().setFromObject(focusTarget);

    const objectCenter = new THREE.Vector3();
    box.getCenter(objectCenter);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const meshForNormal = (referenceMesh ?? targetObject) as THREE.Mesh;
    const worldNormal = this.getWorldNormal(meshForNormal);
    const camera = this.threeApp.camera;

    const toCurrentCamera = camera.position.clone().sub(objectCenter).normalize();
    if (worldNormal.dot(toCurrentCamera) < 0) {
      worldNormal.negate();
    }

    const finalCameraPos = objectCenter.clone().add(worldNormal.multiplyScalar(this.SAFE_DISTANCE));

    const desiredVisibleHeight = maxDim / fillRatio;
    const targetZoom = this.threeApp.frustumSizeValue() / desiredVisibleHeight;

    return {
      cameraPos: finalCameraPos,
      targetPos: objectCenter,
      zoom: targetZoom,
    };
  }

  private getWorldNormal(mesh: THREE.Mesh): THREE.Vector3 {
    const geometry = mesh.geometry;
    if (!geometry.attributes['normal']) {
      geometry.computeVertexNormals();
    }
    const normalAttr = geometry.attributes['normal'];
    const localNormal = new THREE.Vector3(
      normalAttr.getX(0),
      normalAttr.getY(0),
      normalAttr.getZ(0),
    );
    return localNormal.transformDirection(mesh.matrixWorld).normalize();
  }

  private setupScreenGuard(screenElement?: HTMLElement): void {
    if (!screenElement) return;

    screenElement.style.pointerEvents = 'auto';
    screenElement.addEventListener('mouseleave', this.onScreenMouseLeave);
    screenElement.addEventListener('mouseenter', this.onScreenMouseEnter);
  }

  private clearScreenGuard(): void {
    if (!this.currentScreenElement) return;

    this.currentScreenElement.style.pointerEvents = 'none';
    this.currentScreenElement.removeEventListener('mouseleave', this.onScreenMouseLeave);
    this.currentScreenElement.removeEventListener('mouseenter', this.onScreenMouseEnter);

    if (this.hoverExitTimeout !== null) {
      clearTimeout(this.hoverExitTimeout);
      this.hoverExitTimeout = null;
    }
    this.currentScreenElement = undefined;
  }

  private onScreenMouseLeave = () => {
    if (this.state() !== CameraStates.FOCUSED || this.hoverExitTimeout !== null) return;

    this.hoverExitTimeout = window.setTimeout(() => {
      this.hoverExitTimeout = null;
      this.returnToIdle();
    }, this.HOVER_EXIT_DELAY);
  };

  private onScreenMouseEnter = () => {
    if (this.hoverExitTimeout !== null) {
      clearTimeout(this.hoverExitTimeout);
      this.hoverExitTimeout = null;
    }
  };
}
