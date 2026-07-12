import { TestBed } from '@angular/core/testing';

import { ViolinUi } from './violin-ui';

describe('ViolinUi', () => {
  let service: ViolinUi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViolinUi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
