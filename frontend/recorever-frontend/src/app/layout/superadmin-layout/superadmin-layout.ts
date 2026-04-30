import { Component } from '@angular/core';
import { SuperadminHeader } from "./superadmin-header/superadmin-header";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-superadmin-layout',
  imports: [SuperadminHeader, RouterOutlet],
  templateUrl: './superadmin-layout.html',
  styleUrl: './superadmin-layout.scss',
})
export class SuperadminLayout {

}
