import { Component, ElementRef, ViewChild, AfterViewInit, DestroyRef, inject } from '@angular/core';
import * as THREE from 'three';
import { ThreeApplication } from './services/three-application';
import { RenderLoop } from './services/render-loop';
import { Resources } from './services/resources';
import { MonitorScreen } from './services/monitor-screen';
import { applyBakedTexture } from './shared/utils/baked-model';

import { InteractiveObjects } from './services/interactive-objects';
import { CameraAnimations } from './services/camera-animations';

@Component({
  selector: 'app-three',
  standalone: true,
  templateUrl: './three.html',
  styleUrls: ['./three.css'],
})
export class Three implements AfterViewInit {
  @ViewChild('webglContainer', { static: true }) webglContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('cssContainer', { static: true }) cssContainer!: ElementRef<HTMLDivElement>;

  private destroyRef = inject(DestroyRef);
  private interactiveService = inject(InteractiveObjects);
  private cameraAnimations = inject(CameraAnimations);
  private resizeListener!: () => void;

  constructor(
    private threeApp: ThreeApplication,
    private renderLoop: RenderLoop,
    private resources: Resources,
    private monitorScreen: MonitorScreen,
  ) {}

  async ngAfterViewInit() {
    this.threeApp.initRenderers(this.webglContainer, this.cssContainer);
    this.interactiveService.init(this.threeApp.scene, this.threeApp.camera);
    const modalName = 'room.glb';
    const modelTextureName = 'room.jpg';

    this.resizeListener = () => this.threeApp.resize();
    window.addEventListener('resize', this.resizeListener);

    const [modelData, texture] = await Promise.all([
      this.resources.loadModel(modalName),
      // this.resources.loadTexture(modelTextureName),
      null,
    ]);

    const bakedScene = applyBakedTexture(modelData.scene, texture, 1);
    modelData.scene.position.y = -1.5;
    this.threeApp.scene.add(bakedScene);

    const roomBox = new THREE.Box3().setFromObject(bakedScene);
    const centroDoQuarto = new THREE.Vector3();
    roomBox.getCenter(centroDoQuarto);

    const posInicialCamera = new THREE.Vector3(
      centroDoQuarto.x + 5,
      centroDoQuarto.y + 2,
      centroDoQuarto.z - 5,
    );

    this.threeApp.camera.position.copy(posInicialCamera);

    this.cameraAnimations.initPendulum(posInicialCamera, centroDoQuarto);

    const monitorTelaMesh = bakedScene.getObjectByName('Monitor_Tela') as THREE.Mesh;
    const monitorMesh = bakedScene.getObjectByName('Monitor') as THREE.Mesh;

    if (monitorTelaMesh) {
      const { cssObject, ghostPlane } = this.monitorScreen.setupMonitorScreen(
        monitorTelaMesh,
        'https://zorin.com',
      );

      const screenElement = cssObject.element as HTMLElement;

      if (screenElement) {
        screenElement.style.pointerEvents = 'none';
      }

      this.threeApp.cssScene.add(cssObject);
      this.threeApp.scene.add(ghostPlane);

      this.interactiveService.onObjectClick((clickedObject) => {
        if (this.cameraAnimations.state === 'PENDULUM') {
          this.interactiveService.enabled = false;
          this.cameraAnimations.focusOnObject(
            clickedObject,
            1.5,
            () => console.log('Zoom finalizado!'),
            monitorTelaMesh,
            screenElement,
          );
        }
      });
    } else {
      console.warn('Mesh "Monitor_Tela" não encontrado no glTF.');
    }

    if (monitorMesh) {
      this.interactiveService.addObject(monitorMesh);
    }

    this.renderLoop.start();

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
