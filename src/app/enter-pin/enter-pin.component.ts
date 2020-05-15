import {Component, Inject, ViewChild, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {PinDialogData} from '../player/player.component';

@Component({
  selector: 'app-enter-pin',
  templateUrl: 'enter-pin.component.html',
  styleUrls: ['./enter-pin.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EnterPinComponent {
  @ViewChild('enterButton', {static: true}) enterButton;
  public pinCompleted = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PinDialogData) {
  }

  public pincodeCompleted(pin) {
    // tslint:disable-next-line:no-shadowed-variable
    if (pin => 0 && pin <= 9999) {
      this.data.pin = pin;
      this.pinCompleted = true;
      this.enterButton.focus();
    }
  }
}
