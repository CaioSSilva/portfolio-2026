import { TestBed } from '@angular/core/testing';

import { ViolinControllers } from './violin-controllers';

describe('ViolinControllers', () => {
  let service: ViolinControllers;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViolinControllers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
