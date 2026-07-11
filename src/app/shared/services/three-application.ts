import { effect, ElementRef, inject, Service, signal } from '@angular/core';
import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Light } from './light';
import { ThemeEnum } from '../interfaces/theme';

@Service()
export class ThreeApplication {
  public scene = new THREE.Scene();
  public cssScene = new THREE.Scene();

  lights = inject(Light);

  public camera!: THREE.OrthographicCamera;
  public controls!: OrbitControls;
  public webGLRenderer: THREE.WebGLRenderer;
  public cssRenderer: CSS3DRenderer;
  public sceneReady = signal(false);
  private frustumSize = 6;

  private lightGroup = new THREE.Group();

  constructor() {
    this.scene.background = null;

    this.webGLRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    this.webGLRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.webGLRenderer.shadowMap.enabled = true;
    this.webGLRenderer.shadowMap.type = THREE.PCFShadowMap;
    this.webGLRenderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.cssRenderer = new CSS3DRenderer();

    effect(() => {
      if (this.lights.lightState() === ThemeEnum.dark) {
        this.scene.remove(this.lightGroup);
      } else {
        this.scene.add(this.lightGroup);
      }
    });
  }

  public frustumSizeValue(): number {
    return this.frustumSize;
  }

  public initRenderers(
    webGlContainer: ElementRef<HTMLDivElement>,
    cssContainer: ElementRef<HTMLDivElement>,
  ): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera = new THREE.OrthographicCamera(
      (this.frustumSize * aspect) / -2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      this.frustumSize / -2,
      0.01,
      1000,
    );

    this.webGLRenderer.setSize(width, height);
    webGlContainer.nativeElement.appendChild(this.webGLRenderer.domElement);

    this.cssRenderer.setSize(width, height);
    cssContainer.nativeElement.appendChild(this.cssRenderer.domElement);

    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';

    this.controls = new OrbitControls(this.camera, this.cssRenderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.minZoom = 1;
    this.controls.maxZoom = 40;

    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minAzimuthAngle = Math.PI / 2;
    this.controls.maxAzimuthAngle = -Math.PI;

    this.setupLighting();
  }
  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.lightGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    this.lightGroup.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.lightGroup.add(dirLight);
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera.left = (this.frustumSize * aspect) / -2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = this.frustumSize / -2;
    this.camera.updateProjectionMatrix();

    this.webGLRenderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
  }
}
