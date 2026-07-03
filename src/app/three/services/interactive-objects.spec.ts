import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { vi } from 'vitest';

import { InteractiveObjects } from './interactive-objects';

describe('InteractiveObjects', () => {
  let service: InteractiveObjects;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let rootMesh: THREE.Mesh;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InteractiveObjects);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    service.init(scene, camera);

    rootMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    rootMesh.position.set(0, 0, 0);
    scene.add(rootMesh);
    service.addObject(rootMesh, true);

    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
      }),
    );
  });

  afterEach(() => {
    service.dispose();
    document.body.style.cursor = 'default';
    vi.restoreAllMocks();
  });

  it('should highlight object under cursor', () => {
    service.update();

    expect(document.body.style.cursor).toBe('pointer');
  });

  it('should reset cursor when disabled', () => {
    service.update();
    expect(document.body.style.cursor).toBe('pointer');

    service.enabled = false;
    service.update();

    expect(document.body.style.cursor).toBe('default');
  });

  it('should trigger callback on click after hover', () => {
    const callback = vi.fn();
    service.onObjectClick(callback);

    service.update();
    window.dispatchEvent(new MouseEvent('click'));

    expect(callback).toHaveBeenCalledWith(rootMesh);
  });
});
