import { Component, ElementRef, ViewChild, AfterViewInit, DestroyRef, inject } from '@angular/core';
import * as THREE from 'three';
import { ThreeApplication } from './services/three-application';
import { RenderLoop } from './services/render-loop';
import { Resources } from './services/resources';
import { MonitorScreen } from './services/monitor-screen';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { InteractiveObjects } from './services/interactive-objects';
import { CameraAnimations } from './services/camera-animations';
import { CameraStates } from './shared/interfaces/camera';
import {
  heroSpeakerWave,
  heroSpeakerXMark,
  heroQuestionMarkCircle,
  heroLightBulb,
  heroVideoCamera,
  heroVideoCameraSlash,
} from '@ng-icons/heroicons/outline';
import { Loading } from '../loading/loading';
import { BootSequence } from './services/boot-sequence';
import { applyBakedTextures } from './shared/utils/baked-model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-three',
  standalone: true,
  templateUrl: './three.html',
  styleUrls: ['./three.css'],
  imports: [NgIcon, Loading, TranslatePipe],
  providers: [
    provideIcons({
      heroLightBulb,
      heroSpeakerWave,
      heroSpeakerXMark,
      heroQuestionMarkCircle,
      heroVideoCamera,
      heroVideoCameraSlash,
    }),
  ],
})
export class Three implements AfterViewInit {
  @ViewChild('webglContainer', { static: true }) webglContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('cssContainer', { static: true }) cssContainer!: ElementRef<HTMLDivElement>;

  public cameraStates = CameraStates;

  private destroyRef = inject(DestroyRef);
  private interactiveService = inject(InteractiveObjects);
  public cameraAnimations = inject(CameraAnimations);
  private bootSequence = inject(BootSequence);
  private resizeListener!: () => void;

  constructor(
    private threeApp: ThreeApplication,
    private renderLoop: RenderLoop,
    private resources: Resources,
    private monitorScreen: MonitorScreen,
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

    const monitorTelaMesh = bakedScene.getObjectByName('Monitor_Tela') as THREE.Mesh;
    const monitorMesh = bakedScene.getObjectByName('Monitor') as THREE.Mesh;

    this.bootSequence.start('monitor');
    if (monitorTelaMesh) {
      const { cssObject, ghostPlane } = this.monitorScreen.setupMonitorScreen(
        monitorTelaMesh,
        'https://caiossilva.com',
      );

      const screenElement = cssObject.element as HTMLElement;

      if (screenElement) {
        screenElement.style.pointerEvents = 'none';
      }

      this.threeApp.cssScene.add(cssObject);
      this.threeApp.scene.add(ghostPlane);

      this.interactiveService.onObjectClick((clickedObject) => {
        const state = this.cameraAnimations.state();

        if (state === CameraStates.IDLE) {
          this.interactiveService.enabled = false;
          this.cameraAnimations.focusOnObject(
            clickedObject,
            1.5,
            () => {},
            monitorTelaMesh,
            screenElement,
          );
        } else if (state === CameraStates.FREE_ROAM) {
          this.interactiveService.enabled = false;
          this.cameraAnimations.resetFromFreeRoam(() => {
            this.cameraAnimations.focusOnObject(
              clickedObject,
              1.5,
              () => {},
              monitorTelaMesh,
              screenElement,
            );
          });
        } else if (state === CameraStates.FOCUSED) {
          this.interactiveService.enabled = false;
          this.cameraAnimations.returnToIdle(() => {
            this.cameraAnimations.focusOnObject(
              clickedObject,
              1.5,
              () => {},
              monitorTelaMesh,
              screenElement,
            );
          });
        }
      });
    }
    this.bootSequence.complete('monitor');

    this.bootSequence.start('interactive');
    if (monitorMesh) {
      this.interactiveService.addObject(monitorMesh);
    }
    this.bootSequence.complete('interactive');

    this.bootSequence.start('render-loop');
    this.renderLoop.start();
    this.bootSequence.complete('render-loop');
    this.threeApp.sceneReady.set(true);

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

  toggleControls() {
    if (this.cameraAnimations.state() === CameraStates.TRANSITIONING) return;
    if (this.cameraAnimations.state() === CameraStates.FOCUSED) return;

    this.cameraAnimations.state() === CameraStates.FREE_ROAM
      ? this.cameraAnimations.resetFromFreeRoam()
      : this.cameraAnimations.startFreeRoam();
  }
}