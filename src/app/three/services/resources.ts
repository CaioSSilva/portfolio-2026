import { Service, signal } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Service()
export class Resources {
  private loadingManager = new THREE.LoadingManager();
  private gltfLoader = new GLTFLoader(this.loadingManager);
  private textureLoader = new THREE.TextureLoader(this.loadingManager);

  public progress = signal(0);

  constructor() {
    this.loadingManager.onProgress = (_url, loaded, total) => {
      this.progress.set(total > 0 ? loaded / total : 1);
    };
  }

  public loadModel(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });
  }

  public loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
  }
}