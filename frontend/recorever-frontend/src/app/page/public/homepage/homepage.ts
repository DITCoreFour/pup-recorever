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

type FaqItem = {
  question: string;
  answer?: string;
  steps?: string[];
  isOpen: boolean;
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

  public faqs: FaqItem[] = [
    {
      question: 'What should I do if I lost an item?',
      steps: [
        'Browse Found Items to see if someone has already turned it in.',
            'Claim Your Item: If you spot your item, click the ' +
            '"Claim Item" button of the item.',
        'Save Your Reference Code.',
        'Visit the Administrator: Once you have your Reference Code, ' +
            'take it to the designated administrator\'s office.',
        'If Not Found In Browsing: Report Lost Item. The system will instantly alert you when if ' +
            'someone reports a found item that matches your description'
      ],
      isOpen: false
    },
    {
      question: 'What should I do if I found an item?',
      steps: [
        'Report the Item: Provide required informations in the form.',
        'Save Your Reference Code.',
        'Turn It In: Bring the found item and your Reference Code ' +
            'directly to the designated administrator\'s office.',
        'Verification & Posting: Once approved, your report will be made ' +
            'public for all users to view, and our Automated Smart Matching ' + 
            'will instantly notify the owner if they are actively looking for it!'
      ],
      isOpen: false
    },
    {
      question: 'How does the Secure Claim Verification work?',
      answer: 'To claim an item, you must provide verifiable proof of '+ 
          'ownership, such as an ID, a detailed description of ' + 
          'unique features, or a password if applicable. Your data is kept entirely private.',
      isOpen: false
    },
    {
      question: 'How long are found items kept in the system?',
      answer: 'Found items are securely stored for 30 days. After reaching' + 
          ' this retention limit, our system sends automated aging ' + 
          'notifications to the administration for appropriate turnover or donation.',
      isOpen: false
    }
  ];

  public get carouselItems(): Feature[] {
    return [...this.features, ...this.features];
  }

  public toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  navigateToLost(): void {
    this.router.navigate(['/app/lost-items']);
  }

  navigateToFound(): void {
    this.router.navigate(['/app/found-items']);
  }
}