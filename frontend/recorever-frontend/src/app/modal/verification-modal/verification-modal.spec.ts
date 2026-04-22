import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificationModal } from './verification-modal';

describe('VerificationModal', () => {
  let component: VerificationModal;
  let fixture: ComponentFixture<VerificationModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificationModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
