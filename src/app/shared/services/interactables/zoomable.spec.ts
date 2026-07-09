import { TestBed } from '@angular/core/testing';

import { Zoomable } from './zoomable';

describe('Zoomable', () => {
  let service: Zoomable;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Zoomable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
