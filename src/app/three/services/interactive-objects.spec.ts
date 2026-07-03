import { TestBed } from '@angular/core/testing';

import { InteractiveObjects } from './interactive-objects';

describe('InteractiveObjects', () => {
  let service: InteractiveObjects;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InteractiveObjects);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
