import { effect, Service, signal, computed } from '@angular/core';
import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

@Service()
export class MonitorScreen {
  public pcIsOn = signal(true);
  public xboxIsOn = signal(true);
  public activeSource = signal<'pc' | 'xbox'>('pc');

  public readonly PC_URL = 'https://portfolio-caios.vercel.app/';
  public readonly XBOX_URL = 'https://caiossilva.github.io/xbox-dash/';

  public currentUrl = computed(() => {
    const pcOn = this.pcIsOn();
    const xboxOn = this.xboxIsOn();
    const source = this.activeSource();

    if (source === 'pc' && pcOn) return this.PC_URL;
    if (source === 'xbox' && xboxOn) return this.XBOX_URL;
    if (pcOn) return this.PC_URL;
    if (xboxOn) return this.XBOX_URL;
    return '';
  });

  private screenDiv?: HTMLDivElement;

  constructor() {
    effect(() => {
      const url = this.currentUrl();

      if (!this.screenDiv) return;

      if (url) {
        this.createIframe(this.screenDiv, url);
      } else {
        this.screenDiv.innerHTML = '';
      }
    });
  }

  public setupMonitorScreen(tela3D: THREE.Mesh) {
    tela3D.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    tela3D.updateWorldMatrix(true, true);

    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    tela3D.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    const box = new THREE.Box3().setFromObject(tela3D);
    const centroGeometrico = new THREE.Vector3();
    box.getCenter(centroGeometrico);

    tela3D.geometry.computeBoundingBox();
    const boundingBox = tela3D.geometry.boundingBox!;

    const widthX = (boundingBox.max.x - boundingBox.min.x) * worldScale.x;
    const widthZ = (boundingBox.max.z - boundingBox.min.z) * worldScale.z;
    const actual3DWidth = Math.max(widthX, widthZ);

    const larguraPixel = 1920;
    const alturaPixel = 1080;
    const scaleFactor = actual3DWidth / larguraPixel;

    const div = document.createElement('div');
    div.style.width = `${larguraPixel}px`;
    div.style.height = `${alturaPixel}px`;
    div.style.backgroundColor = '#000';

    this.screenDiv = div;

    if (this.currentUrl()) {
      this.createIframe(this.screenDiv, this.currentUrl());
    }

    const cssObject = new CSS3DObject(div);
    cssObject.position.copy(centroGeometrico);
    cssObject.quaternion.copy(worldQuaternion);
    cssObject.rotateY(Math.PI);
    cssObject.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const planeGeometry = new THREE.PlaneGeometry(larguraPixel, alturaPixel);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: '#000',
      opacity: 0,
      transparent: true,
      blending: THREE.NoBlending,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    
    const ghostPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    ghostPlane.position.copy(centroGeometrico);
    ghostPlane.quaternion.copy(worldQuaternion);
    ghostPlane.scale.set(scaleFactor, scaleFactor, scaleFactor);

    return { cssObject, ghostPlane, centroGeometrico };
  }

  private createIframe(div: HTMLDivElement, iframeUrl: string) {
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    div.innerHTML = '';
    div.appendChild(iframe);
  }
}