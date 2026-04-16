import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ReportButton } from '../../user/user-item-list-page/report-button/report-button';

type Feature = {
  icon: string;
  title: string;
  details: string;
};

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, ReportButton, MatIconModule],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})
export class Homepage {

  private router = inject(Router);

  public features: Feature[] = [
    {
      icon: 'dynamic_feed',
      title: 'Real-Time Discovery Feed',
      details: 'Scroll through a campus-wide, real-time bulletin of' +
        'discovered items from your phone or laptop, without having the hassle.'
    },
    {
      icon: 'sell',
      title: 'Smart Metadata Tagging',
      details: 'Digital tags connect items to specific, indexed physical' + 
          'storage locations, reducing retrieval time to under 30 seconds.'
    },
    {
      icon: 'manage_search',
      title: 'Automated Smart Matching',
      details: "Don't just wait and hope. Our intelligent engine matches" + 
          "lost reports with found items using keywords and proximity," + 
          "sending you instant email alerts when a potential match is found."
    },
    {
      icon: 'update',
      title: 'Inventory-Aging Notifications',
      details: 'Automated alerts that notify the administration when an' + 
        'unclaimed item has reached its 30-day retention limit, preventing' +
        'overcrowded storage.'
    },
    {
      icon: 'verified_user',
      title: 'Secure Claim Verification',
      details: 'Your belongings are safe. Claiming an item requires' + 
          'verifiable evidence of ownership, ensuring items are only returned' +
          'to their rightful owners while keeping your personal data private.'
    }
  ];

  public get carouselItems(): Feature[] {
    return [...this.features, ...this.features];
  }

  navigateToLost(): void {
    this.router.navigate(['/app/lost-items']);
  }

  navigateToFound(): void {
    this.router.navigate(['/app/found-items']);
  }
}