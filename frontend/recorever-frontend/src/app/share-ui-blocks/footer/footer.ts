import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

type FooterLink = {
  label: string;
  url: string;
  fragment?: string;
};

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {

  protected mainLinks: FooterLink[] = [
    { label: 'Browse', url: 'app/browse' },
    { label: 'The Features', url: '/', fragment: 'features' },
    { label: 'Who We Are', url: '/', fragment: 'about-us' },
    { label: 'Help and Support', url: '/help-page', fragment: 'support' },
  ];

  protected contactInfo = {
    tel: '+63 9654089663',
    email: 'ditcorefour@gmail.com',
    university: 'Polytechnic University of the Philippines',
    github: 'https://github.com/PUP-BSIT/project-corefour'
  };
}