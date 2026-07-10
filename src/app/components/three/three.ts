import { Component, ElementRef, ViewChild, AfterViewInit, DestroyRef, inject } from '@angular/core';
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
  heroLightBulb,
  heroVideoCamera,
  heroVideoCameraSlash,
  heroXMark,
  heroBugAnt,
} from '@ng-icons/heroicons/outline';
import { Loading } from '../loading/loading';
import { BootSequence } from '../../shared/services/boot-sequence';
import { applyBakedTextures } from '../../shared/utils/baked-model';
import { TranslatePipe } from '@ngx-translate/core';
import { InteractableFeature } from '../../shared/interfaces/interactable';
import { Monitor } from '../../shared/services/interactables/monitor';
import { Zoomable } from '../../shared/services/interactables/zoomable';
import { ZoomableOverlay } from "../zoomable-overlay/zoomable-overlay";
import { SoundingSystem } from '../../shared/services/sounding-system';
import { Keyboard } from '../../shared/services/interactables/keyboard';
import { Pc } from '../../shared/services/interactables/pc';

@Component({
  selector: 'app-three',
  standalone: true,
  templateUrl: './three.html',
  styleUrls: ['./three.css'],
  imports: [NgIcon, Loading, TranslatePipe, ZoomableOverlay],
  providers: [
    provideIcons({
      heroLightBulb,
      heroSpeakerWave,
      heroSpeakerXMark,
      heroQuestionMarkCircle,
      heroVideoCamera,
      heroVideoCameraSlash,
      heroXMark,
      heroBugAnt
    }),
  ],
})
export class Three implements AfterViewInit {
  @ViewChild('webglContainer', { static: true }) webglContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('cssContainer', { static: true }) cssContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('helperWrapper', { static: true }) helperWrapper!: ElementRef<HTMLDivElement>;

  public cameraStates = CameraStates;

  private destroyRef = inject(DestroyRef);
  private interactiveService = inject(InteractiveObjects);
  public cameraAnimations = inject(CameraAnimations);
  private bootSequence = inject(BootSequence);
  public audio = inject(SoundingSystem);
  private keyboardService = inject(Keyboard);
  private pc = inject(Pc);
  private monitorInteraction = inject(Monitor);
  private zoomableInteraction = inject(Zoomable);
  private interactions: InteractableFeature[] = [this.monitorInteraction, this.zoomableInteraction, this.pc];

  private resizeListener!: () => void;

  constructor(
    private threeApp: ThreeApplication,
    private renderLoop: RenderLoop,
    private resources: Resources,
  ) {}

  async ngAfterViewInit() {
    this.bootSequence.start('renderers');
    this.threeApp.initRenderers(this.webglContainer, this.cssContainer);
    this.interactiveService.init(this.threeApp.scene, this.threeApp.camera);
    this.bootSequence.complete('renderers');

    const modalName = '/models/room.glb';

    this.resizeListener = () => this.threeApp.resize();
    window.addEventListener('resize', this.resizeListener);

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
    modelData.scene.position.y = -1.5;
    this.threeApp.scene.add(bakedScene);
    this.bootSequence.complete('texture');

    this.bootSequence.start('bounds');
    const roomBox = new THREE.Box3().setFromObject(bakedScene);
    const centroDoQuarto = new THREE.Vector3();
    roomBox.getCenter(centroDoQuarto);
    this.bootSequence.complete('bounds');

    this.bootSequence.start('camera');
    const posInicialCamera = new THREE.Vector3(
      centroDoQuarto.x + 5,
      centroDoQuarto.y + 2,
      centroDoQuarto.z - 5,
    );

    this.threeApp.camera.position.copy(posInicialCamera);
    this.cameraAnimations.initIdle(posInicialCamera, centroDoQuarto);
    this.bootSequence.complete('camera');

    this.bootSequence.start('interactions');
    this.interactions.forEach(interaction => {
      interaction.setup(this.threeApp.scene, this.cameraAnimations, this.threeApp.cssScene);
    });

    this.interactiveService.onObjectClick((clickedObject) => {
      const handler = this.interactions.find(i => i.matches(clickedObject.name));
      if (handler) {
        handler.onClick(clickedObject, this.cameraAnimations);
      }
    });
    this.bootSequence.complete('interactions');

    this.bootSequence.start('render-loop');
    this.renderLoop.start();
    this.bootSequence.complete('render-loop');
    this.threeApp.sceneReady.set(true);

    this.keyboardService.init(this.threeApp.scene);

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

  resetCurrentFocus() {
    if (this.cameraAnimations.state() !== CameraStates.FOCUSED) return;
    
    const activeHandler = this.interactions.find(i => {
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

  toggleControls() {
    if (this.cameraAnimations.state() === CameraStates.TRANSITIONING) return;
    if (this.cameraAnimations.state() === CameraStates.FOCUSED) return;

    this.cameraAnimations.state() === CameraStates.FREE_ROAM
      ? this.cameraAnimations.resetFromFreeRoam()
      : this.cameraAnimations.startFreeRoam();
  }

  toggleHelper() {
    this.helperWrapper.nativeElement.style.display !== 'flex'
      ? (this.helperWrapper.nativeElement.style.display = 'flex')
      : (this.helperWrapper.nativeElement.style.display = 'none');
  }
}