import { TestBed } from '@angular/core/testing';

import { BootSequence } from './boot-sequence';

describe('BootSequence', () => {
  let service: BootSequence;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BootSequence);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
