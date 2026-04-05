import { Component, inject, OnDestroy, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, switchMap, takeUntil, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { NavItem, ProfileNavItem, User } from '../../../models/user-model';
import { Notification } from '../../../share-ui-blocks/notification/notification';
import { AuthService } from '../../../core/auth/auth-service';
import { ConfirmationModal } from '../../../modal/confirmation-modal/confirmation-modal';
import { SettingsModal } from '../../../modal/settings-modal/settings-modal';
import { environment } from '../../../../environments/environment';
import { AppRoutePaths } from '../../../app.routes';

type HeaderNavItem = NavItem & {
  fragment?: string;
};

enum ProfileAction {
  NAVIGATE = 'NAVIGATE',
  OPEN_SETTINGS = 'OPEN_SETTINGS',
  LOGOUT = 'LOGOUT'
}

type HeaderProfileNavItem = ProfileNavItem & {
  actionValue?: ProfileAction;
};

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Notification,
    ConfirmationModal,
    MatDialogModule
  ],
  templateUrl: './admin-header.html',
  styleUrl: './admin-header.scss',
})
export class AdminHeader implements OnDestroy {
  @ViewChild('profileSection') profileSection!: ElementRef;
  @ViewChild('reportSection') reportSection!: ElementRef; 
  @ViewChild('archiveSection') archiveSection!: ElementRef;

  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private dialog: MatDialog = inject(MatDialog);

  private logoutTrigger$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  public currentUser = toSignal<User | null>(
    this.authService.currentUser$.pipe(
      catchError(() => of(null))
    ),
    { initialValue: null }
  );

  protected isLogoutModalOpen = false;
  protected isProfileDropdownOpen = false;
  protected isReportDropdownOpen = false; 
  protected isArchiveDropdownOpen = false;

  protected navItems: HeaderNavItem[] = [
    {
      label: 'Dashboard',
      route: '/admin/dashboard',
      iconPath: 'assets/dashboard.png'
    },
    {
      label: "Manage Lost Item",
      iconPath: "/assets/report-status.png",
      route: AppRoutePaths.REPORT_STATUS_MANAGEMENT,
    },
    {
      label: 'Found Status Management',
      route: '/admin/claim-status',
      iconPath: 'assets/claim-status.png'
    }
  ];

  protected profileDropdownItems: HeaderProfileNavItem[] = [
    { label: 'Settings', iconPath: 'assets/setting.png',
      action: 'openSettings', actionValue: ProfileAction.OPEN_SETTINGS },
    { label: 'Log out', iconPath: 'assets/log-out.png',
      action: 'logout', actionValue: ProfileAction.LOGOUT },
  ];

  constructor() {
    this.logoutTrigger$
      .pipe(
        switchMap(() => this.authService.logout()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (): void => {
          this.isLogoutModalOpen = false;
        },
        error: (): void => {
          this.isLogoutModalOpen = false;
        }
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isProfileDropdownOpen && this.profileSection &&
      !this.profileSection.nativeElement.contains(event.target as Node)) {
      this.isProfileDropdownOpen = false;
    }
    if (this.isReportDropdownOpen && this.reportSection &&
      !this.reportSection.nativeElement.contains(event.target as Node)) {
      this.isReportDropdownOpen = false;
    }
    if (this.isArchiveDropdownOpen && this.archiveSection &&
      !this.archiveSection.nativeElement.contains(event.target as Node)) {
      this.isArchiveDropdownOpen = false;
    }
  }

  public onLogoClick(): void {
    const targetRoute = '/admin/dashboard';
    if (this.router.url.includes(targetRoute)) {
      window.location.reload();
    } else {
      this.router.navigate([targetRoute]);
    }
  }

  protected getProfileImageUrl(path: string | null | undefined): string {
    if (!path) return 'assets/profile-avatar.png';
    if (path.startsWith('http')) return path.replace('http://', 'https://');
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${path}`;
  }

  public toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    this.isReportDropdownOpen = false;
    this.isArchiveDropdownOpen = false;
  }

  public toggleReportDropdown(): void {
    this.isReportDropdownOpen = !this.isReportDropdownOpen;
    this.isProfileDropdownOpen = false;
    this.isArchiveDropdownOpen = false;
  }

  // Toggle logic for Archive Dropdown
  public toggleArchiveDropdown(): void {
    this.isArchiveDropdownOpen = !this.isArchiveDropdownOpen;
    this.isProfileDropdownOpen = false;
    this.isReportDropdownOpen = false;
  }

  public closeReportDropdown(): void {
    this.isReportDropdownOpen = false;
  }

  public closeArchiveDropdown(): void {
    this.isArchiveDropdownOpen = false;
  }

  public handleDropdownAction(item: HeaderProfileNavItem): void {
    this.isProfileDropdownOpen = false;
    switch (item.actionValue) {
      case ProfileAction.NAVIGATE:
        if (item.route) this.router.navigate([item.route]);
        break;
      case ProfileAction.OPEN_SETTINGS:
        this.dialog.open(SettingsModal);
        break;
      case ProfileAction.LOGOUT:
        this.isLogoutModalOpen = true;
        break;
    }
  }

  public isRouteActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  protected onLogoutConfirm(): void {
    this.logoutTrigger$.next();
  }

  protected onLogoutCancel(): void {
    this.isLogoutModalOpen = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}