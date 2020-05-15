import {Component, ViewEncapsulation} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-gdpr',
  templateUrl: './gdpr.component.html',
  styleUrls: ['./gdpr.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GdprComponent {
  constructor(private gdpr: MatSnackBar) {
  }

  public dismiss() {
    this.gdpr.dismiss();
  }
}
