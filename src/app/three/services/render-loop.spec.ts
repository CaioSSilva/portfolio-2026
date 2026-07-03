import { TestBed } from '@angular/core/testing';

import { RenderLoop } from './render-loop';

describe('RenderLoop', () => {
  let service: RenderLoop;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RenderLoop);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
