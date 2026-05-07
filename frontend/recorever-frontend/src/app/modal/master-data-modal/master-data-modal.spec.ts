import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterDataModal } from './master-data-modal';

describe('MasterDataModal', () => {
  let component: MasterDataModal;
  let fixture: ComponentFixture<MasterDataModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterDataModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterDataModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
