import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  DestroyRef,
  inject,
  effect,
  untracked,
} from '@angular/core';
import * as THREE from 'three';
import { ThreeApplication } from '../../shared/services/three-application';
import { RenderLoop } from '../../shared/services/render-loop';
import { Resources } from '../../shared/services/resources';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { InteractiveObjects } from '../../shared/services/interactive-objects';
import { CameraAnimations } from '../../shared/services/camera-animations';
import { CameraStates } from '../../shared/interfaces/camera';
import {
  heroSpeakerWave,
  heroSpeakerXMark,
  heroQuestionMarkCircle,
  heroVideoCamera,
  heroVideoCameraSlash,
  heroXMark,
  heroBugAnt,
  heroBolt,
  heroBoltSlash,
} from '@ng-icons/heroicons/outline';
import { Loading } from '../loading/loading';
import { BootSequence } from '../../shared/services/boot-sequence';
import { applyBakedTextures } from '../../shared/utils/baked-model';
import { TranslatePipe } from '@ngx-translate/core';
import { InteractableFeature } from '../../shared/interfaces/interactable';
import { Monitor } from '../../shared/services/interactables/monitor';
import { Zoomable } from '../../shared/services/interactables/zoomable';
import { ZoomableOverlay } from '../zoomable-overlay/zoomable-overlay';
import { SoundingSystem } from '../../shared/services/sounding-system';
import { Keyboard } from '../../shared/services/interactables/keyboard';
import { Pc } from '../../shared/services/interactables/pc';
import { Xbox } from '../../shared/services/interactables/xbox';
import { Light } from '../../shared/services/light';
import { ThemeEnum } from '../../shared/interfaces/theme';

@Component({
  selector: 'app-three',
  standalone: true,
  templateUrl: './three.html',
  styleUrls: ['./three.css'],
  imports: [NgIcon, Loading, TranslatePipe, ZoomableOverlay],
  providers: [
    provideIcons({
      heroBolt,
      heroBoltSlash,
      heroSpeakerWave,
      heroSpeakerXMark,
      heroQuestionMarkCircle,
      heroVideoCamera,
      heroVideoCameraSlash,
      heroXMark,
      heroBugAnt,
    }),
  ],
})
export class Three implements AfterViewInit {
  @ViewChild('webglContainer', { static: true }) webglContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('cssContainer', { static: true }) cssContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('helperWrapper', { static: true }) helperWrapper!: ElementRef<HTMLDivElement>;

  public cameraStates = CameraStates;
  public lightStates = ThemeEnum;

  private destroyRef = inject(DestroyRef);
  private interactiveService = inject(InteractiveObjects);
  public cameraAnimations = inject(CameraAnimations);
  private bootSequence = inject(BootSequence);
  public audio = inject(SoundingSystem);
  private keyboardService = inject(Keyboard);
  private pc = inject(Pc);
  private xbox = inject(Xbox);
  private monitorInteraction = inject(Monitor);
  private zoomableInteraction = inject(Zoomable);
  public light = inject(Light);

  private interactions: InteractableFeature[] = [
    this.monitorInteraction,
    this.zoomableInteraction,
    this.pc,
    this.xbox,
  ];

  private resizeListener!: () => void;
  private modelScene!: THREE.Group;

  constructor(
    private threeApp: ThreeApplication,
    private renderLoop: RenderLoop,
    private resources: Resources,
  ) {
    effect(() => this.handleThemeChange());
  }

  async ngAfterViewInit() {
    this.setupListeners();
    this.initRenderers();

    const bakedScene = await this.loadModelAndTextures();
    const roomCenter = this.calculateRoomCenter(bakedScene);

    this.setupCamera(roomCenter);
    this.setupInteractions();

    this.startLoopAndFinalize();
    this.setupCleanup();
  }

  private setupListeners() {
    this.resizeListener = () => this.threeApp.resize();
    window.addEventListener('resize', this.resizeListener);
  }

  private initRenderers() {
    this.bootSequence.start('renderers');
    this.threeApp.initRenderers(this.webglContainer, this.cssContainer);
    this.interactiveService.init(this.threeApp.scene, this.threeApp.camera);
    this.bootSequence.complete('renderers');
  }

  private async loadModelAndTextures(): Promise<THREE.Group> {
    const modalName = '/models/room.glb';

    this.bootSequence.start('model');
    const modelData = await this.resources.loadModel(modalName);
    this.bootSequence.complete('model');

    this.bootSequence.start('texture');
    const bakedScene = await applyBakedTextures(
      modelData.scene,
      new THREE.TextureLoader(),
      'textures',
      1,
    );

    bakedScene.position.y = -1.5;
    this.threeApp.scene.add(bakedScene);
    this.modelScene = bakedScene;
    this.bootSequence.complete('texture');
    return bakedScene;
  }

  private calculateRoomCenter(scene: THREE.Group): THREE.Vector3 {
    this.bootSequence.start('bounds');
    const roomBox = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    roomBox.getCenter(center);
    this.bootSequence.complete('bounds');

    return center;
  }

  private setupCamera(center: THREE.Vector3) {
    this.bootSequence.start('camera');
    const posInicialCamera = new THREE.Vector3(center.x + 5, center.y + 2, center.z - 5);

    this.threeApp.camera.position.copy(posInicialCamera);
    this.cameraAnimations.initIdle(posInicialCamera, center);
    this.bootSequence.complete('camera');
  }

  private setupInteractions() {
    this.bootSequence.start('interactions');
    this.interactions.forEach((interaction) => {
      interaction.setup(this.threeApp.scene, this.cameraAnimations, this.threeApp.cssScene);
    });

    this.interactiveService.onObjectClick((clickedObject) => {
      const handler = this.interactions.find((i) => i.matches(clickedObject.name));
      if (handler) {
        handler.onClick(clickedObject, this.cameraAnimations);
      }
    });
    this.bootSequence.complete('interactions');
  }

  private startLoopAndFinalize() {
    this.bootSequence.start('render-loop');
    this.renderLoop.start();
    this.bootSequence.complete('render-loop');

    this.threeApp.sceneReady.set(true);
    this.keyboardService.init(this.threeApp.scene);
  }

  private handleThemeChange() {
    const theme = this.light.lightState();
    const isReady = this.threeApp.sceneReady();

    if (!isReady || !this.modelScene) return;

    untracked(() => {
      const currentState = this.cameraAnimations.state();
      if (currentState === CameraStates.FOCUSED) {
        this.resetCurrentFocus();
      } else if (currentState === CameraStates.FREE_ROAM) {
        this.cameraAnimations.resetFromFreeRoam();
      }
    });

    this.modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (theme === ThemeEnum.light) {
          if (child.userData['originalTexture']) {
            child.material.map = child.userData['originalTexture'];
            child.material.color.setHex(0xffffff);
            child.material.needsUpdate = true;
          }
        } else {
          if (child.material.map) {
            child.userData['originalTexture'] = child.material.map;
            child.material.map = null;
            child.material.color.setHex(0x050505);
            child.material.needsUpdate = true;
          }
        }
      }
    });
  }

  public resetCurrentFocus() {
    if (this.cameraAnimations.state() !== CameraStates.FOCUSED) return;

    const activeHandler = this.interactions.find((i) => {
      if (i instanceof Zoomable && (i as any).activeObject()) return true;
      if (i instanceof Monitor && this.cameraAnimations.state() === CameraStates.FOCUSED) {
        return this.threeApp.scene.getObjectByName('Monitor_Tela')?.userData['isFocused'];
      }
      return false;
    });

    if (activeHandler && activeHandler.returnToIdle) {
      activeHandler.returnToIdle(this.cameraAnimations);
    } else {
      this.cameraAnimations.returnToIdle();
    }
  }

  public toggleControls() {
    if (
      this.cameraAnimations.state() === CameraStates.TRANSITIONING ||
      this.cameraAnimations.state() === CameraStates.FOCUSED
    )
      return;

    this.cameraAnimations.state() === CameraStates.FREE_ROAM
      ? this.cameraAnimations.resetFromFreeRoam()
      : this.cameraAnimations.startFreeRoam();
  }

  public toggleHelper() {
    const displayStyle = this.helperWrapper.nativeElement.style.display;
    this.helperWrapper.nativeElement.style.display = displayStyle !== 'flex' ? 'flex' : 'none';
  }

  private setupCleanup() {
    this.destroyRef.onDestroy(() => {
      this.renderLoop.stop();
      window.removeEventListener('resize', this.resizeListener);

      this.threeApp.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose());
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        }
      });

      this.threeApp.webGLRenderer.dispose();
    });
  }
}
