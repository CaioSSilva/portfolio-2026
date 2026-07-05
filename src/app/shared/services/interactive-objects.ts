import { Service } from '@angular/core';
import * as THREE from 'three';
import { InteractableConfig } from '../interfaces/interactable';

@Service()
export class InteractiveObjects {
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private boxHelper!: THREE.BoxHelper;

  private interactableConfigs: InteractableConfig[] = [];
  private raycastTargets: THREE.Object3D[] = [];

  private camera!: THREE.Camera;
  private scene!: THREE.Scene;
  private hoveredObject: THREE.Object3D | null = null;
  private isInitialized = false;

  public enabled: boolean = true;

  private onMouseMoveBound = this.onMouseMove.bind(this);

  private onClickCallback?: (object: THREE.Object3D) => void;

  public onObjectClick(callback: (object: THREE.Object3D) => void): void {
    this.onClickCallback = callback;
  }

  public init(scene: THREE.Scene, camera: THREE.Camera): void {
    this.scene = scene;
    this.camera = camera;

    if (!this.isInitialized) {
      this.boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
      this.boxHelper.visible = false;
      this.boxHelper.raycast = () => {};

      this.scene.add(this.boxHelper);

      window.addEventListener('mousemove', this.onMouseMoveBound);
      window.addEventListener('click', () => {
        if (this.hoveredObject && this.onClickCallback) {
          this.onClickCallback(this.hoveredObject);
        }
      });
      this.isInitialized = true;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  public addObject(object: THREE.Object3D, distinct: boolean = true): void {
    this.interactableConfigs.push({ rootObject: object, distinct });
    this.raycastTargets.push(object);
  }

  private findConfigForHit(hitObject: THREE.Object3D): InteractableConfig | undefined {
    let current: THREE.Object3D | null = hitObject;

    while (current) {
      const config = this.interactableConfigs.find((c) => c.rootObject === current);
      if (config) return config;
      current = current.parent;
    }
    return undefined;
  }

  public update(): void {
    if (!this.isInitialized || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (!this.enabled) {
      this.clearHover();
      return;
    }

    if (intersects.length > 0) {
      const hitNode = intersects[0].object;

      const config = this.findConfigForHit(hitNode);

      if (config) {
        const targetToHighlight = config.distinct ? config.rootObject : hitNode;

        if (this.hoveredObject !== targetToHighlight) {
          this.hoveredObject = targetToHighlight;

          this.boxHelper.setFromObject(this.hoveredObject);
          this.boxHelper.update();
          this.boxHelper.visible = true;
          document.body.style.cursor = 'pointer';
        }
      } else {
        this.clearHover();
      }
    } else {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredObject || this.boxHelper.visible) {
      this.hoveredObject = null;
      this.boxHelper.visible = false;
      document.body.style.cursor = 'default';
    }
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    this.interactableConfigs = [];
    this.raycastTargets = [];
    this.hoveredObject = null;
    this.isInitialized = false;

    if (this.boxHelper && this.scene) {
      this.scene.remove(this.boxHelper);
      this.boxHelper.dispose();
    }
  }
}
