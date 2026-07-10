import { effect, inject, Service } from '@angular/core';
import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Pc } from './interactables/pc';

@Service()
export class MonitorScreen {
  readonly pc = inject(Pc);

  private screenDiv?: HTMLDivElement;
  private currentIframeUrl?: string;

  constructor() {
    effect(() => {
      const isOn = this.pc.isTurnedOn();

      if (!this.screenDiv || !this.currentIframeUrl) return;

      if (isOn) {
        this.createIframe(this.screenDiv, this.currentIframeUrl);
      } else {
        this.screenDiv.innerHTML = '';
      }
    });
  }

  public setupMonitorScreen(tela3D: THREE.Mesh, iframeUrl: string) {
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
    this.currentIframeUrl = iframeUrl;

    if (this.pc.isTurnedOn()) {
      this.createIframe(this.screenDiv, this.currentIframeUrl);
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