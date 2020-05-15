import {Component, Inject, ViewChild, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {PinDialogData} from '../player/player.component';

@Component({
  selector: 'app-pin',
  templateUrl: 'pin.component.html',
  styleUrls: ['./pin.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PinComponent {
  @ViewChild('changeButton', {static: true}) changeButton;
  public pinCompleted = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PinDialogData) {
  }

  public pincodeCompleted(pin) {
    // tslint:disable-next-line:no-shadowed-variable
    if (pin => 0 && pin <= 9999) {
      this.data.pin = pin;
      this.pinCompleted = true;
      this.changeButton.focus();
    }
  }
}
