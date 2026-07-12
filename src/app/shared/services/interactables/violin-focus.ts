import { inject, Injectable } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { InteractableFeature } from '../../interfaces/interactable';
import { CameraAnimations } from '../camera-animations';
import { InteractiveObjects } from '../interactive-objects';
import { CameraStates } from '../../interfaces/camera';
import { Violin } from '../violin';
import { Keyboard } from './keyboard';

@Injectable({ providedIn: 'root' })
export class ViolinFocus extends InteractableFeature {
  public violinoGroup = new THREE.Group();
  public isPlayingViolin = false;

  keyboard = inject(Keyboard);
  interactable = inject(InteractiveObjects);
  violin = inject(Violin);

  private readonly Violin = 'Violino';
  private readonly Bow = 'Bow';

  private readonly violinDisplayOffset = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    -Math.PI / 2,
  );

  private readonly bowPlayingOffset = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  );

  private readonly bowPlayingWorldOffset = new THREE.Vector3(0, -0.3, 0);

  private readonly zoomScale = 5.5;
  private readonly violinDistance = 3.8;
  private readonly overlayDistance = 5.0;

  private mainScene!: THREE.Scene;
  private arcoMesh?: THREE.Object3D;
  private bowBasePosition?: THREE.Vector3; 

  matches(objectName: string): boolean {
    return objectName === 'ViolinGroup';
  }

  setup(scene: THREE.Scene, _cameraAnimations: CameraAnimations, _cssScene?: THREE.Scene): void {
    this.mainScene = scene;

    const violinoMesh = scene.getObjectByName(this.Violin);
    const arcoMesh = scene.getObjectByName(this.Bow);

    this.violinoGroup.name = 'ViolinGroup';

    if (violinoMesh && arcoMesh) {
      this.violinoGroup.attach(violinoMesh);
      this.violinoGroup.attach(arcoMesh);
      this.arcoMesh = arcoMesh;
    }

    scene.add(this.violinoGroup);
    this.interactable.addObject(this.violinoGroup);

    this.violinoGroup.userData['originalPosition'] = this.violinoGroup.position.clone();
    this.violinoGroup.userData['originalRotation'] = this.violinoGroup.rotation.clone();
    this.violinoGroup.userData['originalScale'] = this.violinoGroup.scale.clone();
  }

  onClick(object: THREE.Object3D, cameraAnimations: CameraAnimations): void {
    this.keyboard.ngOnDestroy();
    cameraAnimations.state.set(CameraStates.TRANSITIONING);
    this.interactable.enabled = false;

    const box = new THREE.Box3().setFromObject(this.violinoGroup);
    const worldCenter = new THREE.Vector3();
    box.getCenter(worldCenter);

    const pivotContainer = new THREE.Group();
    pivotContainer.name = 'Pivot_ViolinGroup';
    this.mainScene.add(pivotContainer);
    pivotContainer.position.copy(worldCenter);

    this.violinoGroup.userData['originalParent'] = this.violinoGroup.parent;
    this.violinoGroup.userData['initContainerPos'] = pivotContainer.position.clone();
    this.violinoGroup.userData['initContainerRot'] = pivotContainer.quaternion.clone();
    this.violinoGroup.userData['pivotContainer'] = pivotContainer;

    pivotContainer.attach(this.violinoGroup);

    const camera = (cameraAnimations as any).threeApp.camera;
    const cameraWorldQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(cameraWorldQuaternion);
    const targetQuaternion = cameraWorldQuaternion.clone().multiply(this.violinDisplayOffset);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const targetWorldPosition = camera.position
      .clone()
      .add(direction.clone().multiplyScalar(this.violinDistance));

    const overlayGeo = new THREE.PlaneGeometry(100, 100);
    const overlayMat = new THREE.MeshBasicMaterial({
      color: 0x0f0f14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const webglOverlay = new THREE.Mesh(overlayGeo, overlayMat);
    const overlayTarget = camera.position
      .clone()
      .add(direction.clone().multiplyScalar(this.overlayDistance));

    webglOverlay.position.copy(overlayTarget);
    webglOverlay.lookAt(camera.position);

    this.mainScene.add(webglOverlay);
    this.violinoGroup.userData['webglOverlay'] = webglOverlay;

    this.mainScene.updateMatrixWorld();
    this.mainScene.worldToLocal(targetWorldPosition);

    gsap.to(overlayMat, {
      opacity: 0.85,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    gsap.to(pivotContainer.position, {
      x: targetWorldPosition.x,
      y: targetWorldPosition.y,
      z: targetWorldPosition.z,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => {
        cameraAnimations.state.set(CameraStates.FOCUSED);
        this.isPlayingViolin = true;
        this.violin.show();
      },
    });

    gsap.to(pivotContainer.scale, {
      x: this.zoomScale,
      y: this.zoomScale,
      z: this.zoomScale,
      duration: 1.2,
      ease: 'power2.inOut',
    });

    this.slerpTo(pivotContainer, targetQuaternion, 1.2);

    if (this.arcoMesh) {
      this.arcoMesh.userData['restQuaternion'] = this.arcoMesh.quaternion.clone();
      this.arcoMesh.userData['restPosition'] = this.arcoMesh.position.clone();

      const bowTargetQuaternion = this.arcoMesh.quaternion.clone().multiply(this.bowPlayingOffset);
      const bowLocalOffset = this.bowPlayingWorldOffset.clone().divideScalar(this.zoomScale);
      
      this.bowBasePosition = this.arcoMesh.position.clone().add(bowLocalOffset);

      this.slerpTo(this.arcoMesh, bowTargetQuaternion, 1.2);
      this.lerpTo(this.arcoMesh, this.bowBasePosition, 1.2);
    }
  }

  public update(): void {
    if (!this.isPlayingViolin || !this.arcoMesh || !this.bowBasePosition) return;

    const physics = this.violin.bowPhysics();
    this.arcoMesh.position.x = this.bowBasePosition.x + (physics.position * -0.5);
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    this.isPlayingViolin = false;
    this.violin.hide();
    
    this.violin.bowPhysics.set({ velocity: 0, direction: 1, position: 0 });

    cameraAnimations.state.set(CameraStates.TRANSITIONING);

    if (this.arcoMesh && this.arcoMesh.userData['restQuaternion']) {
      this.slerpTo(this.arcoMesh, this.arcoMesh.userData['restQuaternion'], 1.0);
      this.lerpTo(this.arcoMesh, this.arcoMesh.userData['restPosition'], 1.0);
    }

    const pivotContainer = this.violinoGroup.userData['pivotContainer'] as THREE.Group;
    const webglOverlay = this.violinoGroup.userData['webglOverlay'] as THREE.Mesh;
    const originalParent = this.violinoGroup.userData['originalParent'] as THREE.Object3D;

    const initContainerPos = this.violinoGroup.userData['initContainerPos'] as THREE.Vector3;
    const initContainerRot = this.violinoGroup.userData['initContainerRot'] as THREE.Quaternion;

    const origPos = this.violinoGroup.userData['originalPosition'];
    const origRot = this.violinoGroup.userData['originalRotation'];
    const origScale = this.violinoGroup.userData['originalScale'];

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

    if (pivotContainer && initContainerPos && initContainerRot) {
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

      this.slerpTo(pivotContainer, initContainerRot, 1.0);

      gsap.delayedCall(1.0, () => {
        if (originalParent) {
          originalParent.attach(this.violinoGroup);
        }

        if (origPos) this.violinoGroup.position.copy(origPos);
        if (origRot) this.violinoGroup.rotation.copy(origRot);
        if (origScale) this.violinoGroup.scale.copy(origScale);

        pivotContainer.parent?.remove(pivotContainer);

        this.interactable.enabled = true;
        cameraAnimations.state.set(CameraStates.IDLE);
        this.keyboard.restart();
      });
    } else {
      this.interactable.enabled = true;
      cameraAnimations.state.set(CameraStates.IDLE);
      this.keyboard.restart();
    }
  }

  private slerpTo(object: THREE.Object3D, target: THREE.Quaternion, duration: number): void {
    const proxy = { t: 0 };
    const start = object.quaternion.clone();

    gsap.to(proxy, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        object.quaternion.slerpQuaternions(start, target, proxy.t);
      },
    });
  }

  private lerpTo(object: THREE.Object3D, target: THREE.Vector3, duration: number): void {
    gsap.to(object.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration,
      ease: 'power2.inOut',
    });
  }
}