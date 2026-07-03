import { inject, Service } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { ThreeApplication } from './three-application';
import { CameraState } from '../shared/interfaces/camera';
import { InteractiveObjects } from './interactive-objects';

@Service()
export class CameraAnimations {
  private threeApp = inject(ThreeApplication);

  private interactiveService = inject(InteractiveObjects);
  private currentScreenElement?: HTMLElement;

  public state: CameraState = 'IDLE';
  private baseCameraPos = new THREE.Vector3();
  private baseTargetPos = new THREE.Vector3();
  private hoverExitTimeout: number | null = null;
  private readonly HOVER_EXIT_DELAY = 800;

  public initIdle(cameraPos: THREE.Vector3, targetPos: THREE.Vector3): void {
    this.baseCameraPos.copy(cameraPos);
    this.baseTargetPos.copy(targetPos);
    this.startIdle();
  }

  public startIdle(): void {
    this.state = 'IDLE';
    if (this.threeApp.controls) {
      this.threeApp.controls.enabled = false;
      this.threeApp.controls.target.copy(this.baseTargetPos);
      this.threeApp.controls.update();
    }
    this.threeApp.camera.position.copy(this.baseCameraPos);
    this.threeApp.camera.lookAt(this.baseTargetPos);
  }

  public focusOnObject(
    targetObject: THREE.Object3D,
    fillRatio: number = 0.6,
    onComplete?: () => void,
    referenceMesh?: THREE.Mesh,
    screenElement?: HTMLElement,
  ): void {
    if (this.state === 'TRANSITIONING') return;
    this.state = 'TRANSITIONING';

    this.currentScreenElement = screenElement;

    const controls = this.threeApp.controls;
    const camera = this.threeApp.camera as THREE.OrthographicCamera | THREE.PerspectiveCamera;

    if (controls) controls.enabled = false;

    const focusTarget = referenceMesh ?? targetObject;

    const box = new THREE.Box3().setFromObject(focusTarget);
    const objectCenter = new THREE.Vector3();
    box.getCenter(objectCenter);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const meshForNormal = (referenceMesh ?? targetObject) as THREE.Mesh;
    const worldNormal = this.getWorldNormal(meshForNormal);

    const toCurrentCamera = camera.position.clone().sub(objectCenter).normalize();
    if (worldNormal.dot(toCurrentCamera) < 0) {
      worldNormal.negate();
    }

    const safeDistance = 3;
    const finalCameraPos = objectCenter.clone().add(worldNormal.multiplyScalar(safeDistance));

    gsap.to(camera.position, {
      x: finalCameraPos.x,
      y: finalCameraPos.y,
      z: finalCameraPos.z,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    const desiredVisibleHeight = maxDim / fillRatio;
    const targetZoom = this.threeApp.frustumSizeValue() / desiredVisibleHeight;

    gsap.to(camera, {
      zoom: targetZoom,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.updateProjectionMatrix(),
    });

    if (controls) {
      gsap.to(controls.target, {
        x: objectCenter.x,
        y: objectCenter.y,
        z: objectCenter.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(controls.target),
        onComplete: () => {
          this.state = 'FOCUSED';
          controls.update();
          controls.enabled = true;
          if (screenElement) {
            screenElement.style.pointerEvents = 'auto';
            this.attachScreenHoverGuard(screenElement);
          }
          if (onComplete) onComplete();
        },
      });
    }
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

  public update(): void {
    if (this.state === 'IDLE') {
      this.threeApp.camera.position.copy(this.baseCameraPos);
      this.threeApp.camera.lookAt(this.baseTargetPos);
    }
  }

  private onScreenMouseLeave = () => {
    if (this.state !== 'FOCUSED') return;
    if (this.hoverExitTimeout !== null) return;
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

  public attachScreenHoverGuard(screenElement: HTMLElement): void {
    screenElement.addEventListener('mouseleave', this.onScreenMouseLeave);
    screenElement.addEventListener('mouseenter', this.onScreenMouseEnter);
  }

  public detachScreenHoverGuard(screenElement: HTMLElement): void {
    screenElement.style.pointerEvents = 'none';
    screenElement.removeEventListener('mouseleave', this.onScreenMouseLeave);
    screenElement.removeEventListener('mouseenter', this.onScreenMouseEnter);
    if (this.hoverExitTimeout !== null) {
      clearTimeout(this.hoverExitTimeout);
      this.hoverExitTimeout = null;
    }
  }

  public returnToIdle(): void {
    if (this.state !== 'FOCUSED') return;
    this.state = 'TRANSITIONING';

    const controls = this.threeApp.controls;
    const camera = this.threeApp.camera;

    if (controls) controls.enabled = false;

    gsap.to(camera.position, {
      x: this.baseCameraPos.x,
      y: this.baseCameraPos.y,
      z: this.baseCameraPos.z,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    gsap.to(camera, {
      zoom: 1,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => camera.updateProjectionMatrix(),
    });

    if (controls) {
      gsap.to(controls.target, {
        x: this.baseTargetPos.x,
        y: this.baseTargetPos.y,
        z: this.baseTargetPos.z,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(controls.target),
        onComplete: () => {
          controls.enabled = false;
          if (this.currentScreenElement) {
            this.detachScreenHoverGuard(this.currentScreenElement);
            this.currentScreenElement = undefined;
          }
          this.startIdle();

          this.interactiveService.enabled = true;
        },
      });
    }
  }
}
