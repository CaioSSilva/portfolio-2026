import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { MonitorScreen } from './monitor-screen';

describe('MonitorScreen', () => {
  let service: MonitorScreen;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MonitorScreen);
  });

  it('should setup css screen object and ghost plane from mesh', () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );

    const result = service.setupMonitorScreen(mesh, 'https://example.com');
    const element = result.cssObject.element as HTMLElement;

    expect(result.cssObject).toBeTruthy();
    expect(result.ghostPlane).toBeTruthy();
    expect(result.cssObject.scale.x).toBeGreaterThan(0);
    expect(element.querySelector('iframe')?.getAttribute('src')).toContain('https://example.com');
    expect((mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x000000);
  });
});
