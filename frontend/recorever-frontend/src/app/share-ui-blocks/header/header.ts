import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { RouterModule, Router, RouteReuseStrategy, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth-service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {

  @Input() showButtons = false;
  @Input() showMenuButton = false;

  @Output() menuToggled = new EventEmitter<void>();

  public isHomepage$: Observable<boolean>;
  public isLoggedIn = false;
  public isScrolled = false;
  public isSidebarOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private routeReuseStrategy: RouteReuseStrategy,
    private scroller: ViewportScroller,
  ) {
    this.isHomepage$ = this.router.events.pipe(
      filter((event: RouterEvent):
          event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects === '/'),
      startWith(this.router.url === '/'),
    );
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  @HostListener('window:scroll', [])
  public onWindowScroll(): void {
    const scrollPosition: [number, number] = this.scroller.getScrollPosition();
    this.isScrolled = scrollPosition[1] > 50;
  }

  @HostListener('document:keydown.escape', [])
  public onEscapeKey(): void {
    this.closeSidebar();
  }

  public toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.menuToggled.emit();
  }

  public closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  public onLogoClick(): void {
    const currentUrl: string = this.router.url;

    if (currentUrl.includes('login') || currentUrl.includes('register')) {
      this.router.navigate(['/']);
    } else {
      this.scroller.scrollToPosition([0, 0]);

      this.routeReuseStrategy.shouldReuseRoute = () => false;

      this.router.navigate([currentUrl], {
        onSameUrlNavigation: 'reload',
      });
    }
  }

  public onNavClick(sectionId: string): void {
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.scrollTo(sectionId), 100);
      });
    } else {
      this.scrollTo(sectionId);
    }
  }

  public onSidebarNavClick(sectionId: string): void {
    this.closeSidebar();
    this.onNavClick(sectionId);
  }

  private scrollTo(id: string): void {
    this.scroller.scrollToAnchor(id);
  }
}