import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViolinUi } from './violin-ui';

describe('ViolinUi', () => {
  let component: ViolinUi;
  let fixture: ComponentFixture<ViolinUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViolinUi],
    }).compileComponents();

    fixture = TestBed.createComponent(ViolinUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
