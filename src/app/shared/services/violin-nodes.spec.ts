import { TestBed } from '@angular/core/testing';

import { ViolinNodes } from './violin-nodes';

describe('ViolinNodes', () => {
  let service: ViolinNodes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViolinNodes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
