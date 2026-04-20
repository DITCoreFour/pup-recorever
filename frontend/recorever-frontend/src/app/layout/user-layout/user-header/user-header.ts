import { Component, inject, OnDestroy, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subject, switchMap, takeUntil, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { NavItem, ProfileNavItem, User } from '../../../models/user-model';
import { AppRoutePaths } from '../../../app.routes';
import { Notification } from '../../../share-ui-blocks/notification/notification';
import { AuthService } from '../../../core/auth/auth-service';
import { ConfirmationModal } from '../../../modal/confirmation-modal/confirmation-modal';
import { SettingsModal } from '../../../modal/settings-modal/settings-modal';
import { environment } from '../../../../environments/environment';

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
  selector: 'app-user-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Notification,
    ConfirmationModal,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './user-header.html',
  styleUrl: './user-header.scss',
})
export class UserHeader implements OnDestroy {
  @ViewChild('profileSection') profileSection!: ElementRef;

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
  protected showLoginModal = false;
  protected isSidebarOpen = false;

  protected navItems: HeaderNavItem[] = [
    {
      label: 'Browse',
      route: '/app/browse',
      iconPath: 'assets/browse.png'
    },
    {
      label: 'Report Lost Item',
      route: AppRoutePaths.REPORT_LOST,
      iconPath: 'assets/report-lost.png'
    },
    {
      label: 'Report Found Item',
      route: AppRoutePaths.REPORT_FOUND,
      iconPath: 'assets/report-found.png'
    },
    {
      label: 'My Reports',
      route: AppRoutePaths.PROFILE,
      iconPath: 'assets/my-reports.png',
      fragment: 'my-reports-section'
    }
  ];

  protected profileDropdownItems: HeaderProfileNavItem[] = [
    { label: 'Profile', iconPath: 'assets/profile-avatar.png', 
      action: 'navigate', actionValue: ProfileAction.NAVIGATE, 
      route: AppRoutePaths.PROFILE },
    { label: 'Settings', iconPath: 'assets/setting.png',
      action: 'openSettings', actionValue: ProfileAction.OPEN_SETTINGS },
    { label: 'Help Page', iconPath: 'assets/about-us.png',
      action: 'navigate', actionValue: ProfileAction.NAVIGATE,
      route: AppRoutePaths.HELP_PAGE },
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
    if (
      this.isProfileDropdownOpen &&
      this.profileSection &&
      !this.profileSection.nativeElement.contains(event.target as Node)
    ) {
      this.isProfileDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape', [])
  public onEscapeKey(): void {
    this.closeSidebar();
  }

  public toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  public closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  protected getProfileImageUrl(path: string | null | undefined): string {
    if (!path) return 'assets/profile-avatar.png';
    if (path.startsWith('http')) return path.replace('http://', 'https://');
    const secureBaseUrl = environment.apiUrl.replace('http://', 'https://');
    return `${secureBaseUrl}/image/download/${path}`;
  }

  public toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
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
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
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

  public onLogoClick(): void {
    const targetRoute = '/app/browse';

    if (this.router.url.includes(targetRoute)) {
      window.location.reload();
    } else {
      this.router.navigate([targetRoute]);
    }
  }
}