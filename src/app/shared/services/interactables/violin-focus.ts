import { inject, Service } from '@angular/core';
import * as THREE from 'three';
import gsap from 'gsap';
import { InteractableFeature } from '../../interfaces/interactable';
import { CameraAnimations } from '../camera-animations';
import { InteractiveObjects } from '../interactive-objects';
import { CameraStates } from '../../interfaces/camera';
import { Violin } from '../violin';
import { Keyboard } from './keyboard';

interface PivotReturnData {
  pivotContainer?: THREE.Group;
  webglOverlay?: THREE.Mesh;
  originalParent?: THREE.Object3D;
  initContainerPos?: THREE.Vector3;
  initContainerRot?: THREE.Quaternion;
  origPos?: THREE.Vector3;
  origRot?: THREE.Euler;
  origScale?: THREE.Vector3;
}

@Service()
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

  private readonly bowPlayingLocalOffset = new THREE.Vector3(0.45, -0.3, 0);
  private readonly bowLimitMin = -0.0525; 
  private readonly bowLimitMax = -0.0238;

  private readonly zoomScale = 4.3;
  private readonly violinDistance = 3.0;
  private readonly overlayDistance = 5.0;

  private readonly focusAnimationDuration = 1.2;
  private readonly returnAnimationDuration = 1.0;

  private mainScene!: THREE.Scene;
  private arcoMesh?: THREE.Object3D;
  private bowBasePosition?: THREE.Vector3;

  matches(objectName: string): boolean {
    return objectName === 'ViolinGroup';
  }

  setup(scene: THREE.Scene, _cameraAnimations: CameraAnimations, _cssScene?: THREE.Scene): void {
    this.mainScene = scene;
    this.assembleViolinGroup(scene);
    scene.add(this.violinoGroup);
    this.interactable.addObject(this.violinoGroup);
    this.storeOriginalTransform();
  }

  private assembleViolinGroup(scene: THREE.Scene) {
    const violinoMesh = scene.getObjectByName(this.Violin);
    const arcoMesh = scene.getObjectByName(this.Bow);
    this.violinoGroup.name = 'ViolinGroup';
    if (!violinoMesh || !arcoMesh) return;
    this.violinoGroup.attach(violinoMesh);
    this.violinoGroup.attach(arcoMesh);
    this.arcoMesh = arcoMesh;
  }

  private storeOriginalTransform() {
    this.violinoGroup.userData['originalPosition'] = this.violinoGroup.position.clone();
    this.violinoGroup.userData['originalRotation'] = this.violinoGroup.rotation.clone();
    this.violinoGroup.userData['originalScale'] = this.violinoGroup.scale.clone();
  }

  onClick(_object: THREE.Object3D, cameraAnimations: CameraAnimations): void {
    this.beginFocusTransition(cameraAnimations);
    const pivotContainer = this.createPivotContainer();
    const camera = this.getCamera(cameraAnimations);
    const direction = this.getCameraDirection(camera);
    const targetQuaternion = this.computeTargetQuaternion(camera);
    const targetWorldPosition = this.computeTargetWorldPosition(camera, direction);
    const webglOverlay = this.createOverlayPlane(camera, direction);
    
    this.mainScene.updateMatrixWorld();
    this.mainScene.worldToLocal(targetWorldPosition);
    
    this.animateOverlayIn(webglOverlay);
    this.animatePivotIntoFocus(
      pivotContainer,
      targetWorldPosition,
      targetQuaternion,
      cameraAnimations,
    );
    this.animateBowIntoPlayingPosition();
  }

  private beginFocusTransition(cameraAnimations: CameraAnimations) {
    this.keyboard.ngOnDestroy();
    cameraAnimations.state.set(CameraStates.TRANSITIONING);
    this.interactable.enabled = false;
  }

  private createPivotContainer(): THREE.Group {
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
    return pivotContainer;
  }

  private getCamera(cameraAnimations: CameraAnimations): THREE.Camera {
    return (cameraAnimations as any).threeApp.camera;
  }

  private getCameraDirection(camera: THREE.Camera): THREE.Vector3 {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    return direction;
  }

  private computeTargetQuaternion(camera: THREE.Camera): THREE.Quaternion {
    const cameraWorldQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(cameraWorldQuaternion);
    return cameraWorldQuaternion.clone().multiply(this.violinDisplayOffset);
  }

  private computeTargetWorldPosition(
    camera: THREE.Camera,
    direction: THREE.Vector3,
  ): THREE.Vector3 {
    return camera.position.clone().add(direction.clone().multiplyScalar(this.violinDistance));
  }

  private createOverlayPlane(camera: THREE.Camera, direction: THREE.Vector3): THREE.Mesh {
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
    return webglOverlay;
  }

  private animateOverlayIn(webglOverlay: THREE.Mesh) {
    gsap.to(webglOverlay.material as THREE.MeshBasicMaterial, {
      opacity: 0.85,
      duration: this.focusAnimationDuration,
      ease: 'power2.inOut',
    });
  }

  private animatePivotIntoFocus(
    pivotContainer: THREE.Group,
    targetWorldPosition: THREE.Vector3,
    targetQuaternion: THREE.Quaternion,
    cameraAnimations: CameraAnimations,
  ) {
    gsap.to(pivotContainer.position, {
      x: targetWorldPosition.x,
      y: targetWorldPosition.y,
      z: targetWorldPosition.z,
      duration: this.focusAnimationDuration,
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
      duration: this.focusAnimationDuration,
      ease: 'power2.inOut',
    });
    this.slerpTo(pivotContainer, targetQuaternion, this.focusAnimationDuration);
  }

  private animateBowIntoPlayingPosition() {
    if (!this.arcoMesh) return;
    this.arcoMesh.userData['restQuaternion'] = this.arcoMesh.quaternion.clone();
    this.arcoMesh.userData['restPosition'] = this.arcoMesh.position.clone();
    
    const bowTargetQuaternion = this.arcoMesh.quaternion.clone().multiply(this.bowPlayingOffset);
    const bowLocalOffset = this.bowPlayingLocalOffset.clone().divideScalar(this.zoomScale);
    
    this.bowBasePosition = this.arcoMesh.position.clone().add(bowLocalOffset);
    
    this.slerpTo(this.arcoMesh, bowTargetQuaternion, this.focusAnimationDuration);
    this.lerpTo(this.arcoMesh, this.bowBasePosition, this.focusAnimationDuration);
  }

  public update(): void {
    if (!this.isPlayingViolin || !this.arcoMesh || !this.bowBasePosition) return;

    const physics = this.violin.bowPhysics();
    
    const LOGICAL_BOW_LIMIT = 1.5; 
    
    const mappedZ = THREE.MathUtils.mapLinear(
      physics.position,
      -LOGICAL_BOW_LIMIT,
      LOGICAL_BOW_LIMIT,
      this.bowLimitMin,
      this.bowLimitMax 
    );

    this.arcoMesh.position.z = this.bowBasePosition.z + mappedZ;
  }

  returnToIdle(cameraAnimations: CameraAnimations): void {
    this.resetViolinAudioState();
    cameraAnimations.state.set(CameraStates.TRANSITIONING);
    this.restoreBowRestPose();
    const pivotData = this.getPivotReturnData();
    this.fadeOutOverlay(pivotData.webglOverlay);
    if (pivotData.pivotContainer && pivotData.initContainerPos && pivotData.initContainerRot) {
      this.animatePivotBackToOrigin(pivotData, cameraAnimations);
    } else {
      this.resumeIdleControls(cameraAnimations);
    }
  }

  private resetViolinAudioState() {
    this.isPlayingViolin = false;
    this.violin.hide();
    this.violin.bowPhysics.set({ velocity: 0, direction: 1, position: 0 });
  }

  private restoreBowRestPose() {
    if (!this.arcoMesh || !this.arcoMesh.userData['restQuaternion']) return;
    this.slerpTo(
      this.arcoMesh,
      this.arcoMesh.userData['restQuaternion'],
      this.returnAnimationDuration,
    );
    this.lerpTo(
      this.arcoMesh,
      this.arcoMesh.userData['restPosition'],
      this.returnAnimationDuration,
    );
  }

  private getPivotReturnData(): PivotReturnData {
    return {
      pivotContainer: this.violinoGroup.userData['pivotContainer'],
      webglOverlay: this.violinoGroup.userData['webglOverlay'],
      originalParent: this.violinoGroup.userData['originalParent'],
      initContainerPos: this.violinoGroup.userData['initContainerPos'],
      initContainerRot: this.violinoGroup.userData['initContainerRot'],
      origPos: this.violinoGroup.userData['originalPosition'],
      origRot: this.violinoGroup.userData['originalRotation'],
      origScale: this.violinoGroup.userData['originalScale'],
    };
  }

  private fadeOutOverlay(webglOverlay?: THREE.Mesh) {
    if (!webglOverlay) return;
    gsap.to(webglOverlay.material as THREE.Material, {
      opacity: 0,
      duration: this.returnAnimationDuration,
      ease: 'power2.inOut',
      onComplete: () => {
        this.mainScene.remove(webglOverlay);
        webglOverlay.geometry.dispose();
        (webglOverlay.material as THREE.Material).dispose();
      },
    });
  }

  private animatePivotBackToOrigin(data: PivotReturnData, cameraAnimations: CameraAnimations) {
    const pivotContainer = data.pivotContainer!;
    const initContainerPos = data.initContainerPos!;
    const initContainerRot = data.initContainerRot!;
    gsap.to(pivotContainer.position, {
      x: initContainerPos.x,
      y: initContainerPos.y,
      z: initContainerPos.z,
      duration: this.returnAnimationDuration,
      ease: 'power2.inOut',
    });
    gsap.to(pivotContainer.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: this.returnAnimationDuration,
      ease: 'power2.inOut',
    });
    this.slerpTo(pivotContainer, initContainerRot, this.returnAnimationDuration);
    gsap.delayedCall(this.returnAnimationDuration, () =>
      this.finalizeReturn(data, cameraAnimations),
    );
  }

  private finalizeReturn(data: PivotReturnData, cameraAnimations: CameraAnimations) {
    const { originalParent, origPos, origRot, origScale } = data;
    const pivotContainer = data.pivotContainer!;
    if (originalParent) originalParent.attach(this.violinoGroup);
    if (origPos) this.violinoGroup.position.copy(origPos);
    if (origRot) this.violinoGroup.rotation.copy(origRot);
    if (origScale) this.violinoGroup.scale.copy(origScale);
    pivotContainer.parent?.remove(pivotContainer);
    this.resumeIdleControls(cameraAnimations);
  }

  private resumeIdleControls(cameraAnimations: CameraAnimations) {
    this.interactable.enabled = true;
    cameraAnimations.state.set(CameraStates.IDLE);
    this.keyboard.restart();
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