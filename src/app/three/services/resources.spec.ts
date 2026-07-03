import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { vi } from 'vitest';

import { Resources } from './resources';

describe('Resources', () => {
  let service: Resources;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Resources);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve loaded model', async () => {
    const modelScene = new THREE.Group();
    modelScene.name = 'room';

    vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation((url, onLoad) => {
      expect(url).toBe('room.glb');
      onLoad({ scene: modelScene } as never);
    });

    const result = await service.loadModel('room.glb');
    expect(result.scene).toBe(modelScene);
  });

  it('should reject when model load fails', async () => {
    const loadError = new Error('failed');

    vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(
      (_url, _onLoad, _onProgress, onError) => {
        if (onError) {
          onError(loadError as never);
        }
      },
    );

    await expect(service.loadModel('room.glb')).rejects.toBe(loadError);
  });

  it('should resolve loaded texture', async () => {
    const texture = new THREE.Texture(document.createElement('img'));

    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
      expect(url).toBe('room.jpg');
      if (onLoad) {
        onLoad(texture);
      }
      return texture;
    });

    await expect(service.loadTexture('room.jpg')).resolves.toBe(texture);
  });
});
