import { inject, Service, effect } from '@angular/core';
import * as THREE from 'three';
import { InteractableConfig } from '../interfaces/interactable';
import { SoundingSystem } from './sounding-system';
import { Light } from './light';
import { ThemeEnum } from '../interfaces/theme';

@Service()
export class InteractiveObjects {
  private sound = inject(SoundingSystem);
  private light = inject(Light);

  public enabled: boolean = true;
  private isLightOn: boolean = true;

  private scene!: THREE.Scene;
  private camera!: THREE.Camera;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private boxHelper!: THREE.BoxHelper;

  private interactableConfigs: InteractableConfig[] = [];
  private raycastTargets: THREE.Object3D[] = [];
  private hoveredObject: THREE.Object3D | null = null;
  private isInitialized = false;

  private onClickCallback?: (object: THREE.Object3D) => void;

  private readonly onMouseMoveBound = this.onMouseMove.bind(this);
  private readonly onClickBound = this.onClick.bind(this);

  constructor() {
    effect(() => {
      this.isLightOn = this.light.lightState() === ThemeEnum.light;
      if (!this.isLightOn) {
        this.clearHover();
      }
    });
  }

  public onObjectClick(callback: (object: THREE.Object3D) => void): void {
    this.onClickCallback = callback;
  }

  public init(scene: THREE.Scene, camera: THREE.Camera): void {
    this.scene = scene;
    this.camera = camera;

    if (this.isInitialized) return;

    this.setupBoxHelper();
    this.setupEventListeners();

    this.isInitialized = true;
  }

  public addObject(object: THREE.Object3D, distinct: boolean = true): void {
    this.interactableConfigs.push({ rootObject: object, distinct });
    this.raycastTargets.push(object);
  }

  public update(): void {
    if (!this.isInitialized || !this.camera) return;

    if (!this.enabled || !this.isLightOn) {
      this.clearHover();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length === 0) {
      this.clearHover();
      return;
    }

    this.processIntersection(intersects[0].object);
  }

  private processIntersection(hitNode: THREE.Object3D): void {
    const config = this.findConfigForHit(hitNode);

    if (!config) {
      this.clearHover();
      return;
    }

    const targetToHighlight = config.distinct ? config.rootObject : hitNode;

    if (this.hoveredObject !== targetToHighlight) {
      this.applyHover(targetToHighlight);
    }
  }

  private applyHover(target: THREE.Object3D): void {
    this.hoveredObject = target;
    this.boxHelper.setFromObject(this.hoveredObject);
    this.boxHelper.update();
    this.boxHelper.visible = true;
    document.body.style.cursor = 'pointer';
    this.sound.playHoverBlip();
  }

  private clearHover(): void {
    if (!this.hoveredObject && (!this.boxHelper || !this.boxHelper.visible)) return;

    this.hoveredObject = null;
    if (this.boxHelper) this.boxHelper.visible = false;
    document.body.style.cursor = 'default';
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

  private setupBoxHelper(): void {
    this.boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
    this.boxHelper.visible = false;
    this.boxHelper.raycast = () => {};
    this.scene.add(this.boxHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('click', this.onClickBound);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private onClick(): void {
    if (this.hoveredObject && this.onClickCallback && this.enabled && this.isLightOn) {
      this.onClickCallback(this.hoveredObject);
    }
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('click', this.onClickBound);

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
