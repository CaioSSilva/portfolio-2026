import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoomableOverlay } from './zoomable-overlay';

describe('ZoomableOverlay', () => {
  let component: ZoomableOverlay;
  let fixture: ComponentFixture<ZoomableOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoomableOverlay],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoomableOverlay);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
