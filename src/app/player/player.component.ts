import {ChangeDetectorRef, Component, Inject, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AngularFireDatabase} from '@angular/fire/database';
import {Observable} from 'rxjs';
import {MatTooltip} from '@angular/material/tooltip';
import {Location} from '@angular/common';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import {AngularFirestore} from '@angular/fire/firestore';

export interface PinDialogData {
  pin: number;
}

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PlayerComponent implements OnInit {
  @ViewChild(MatTooltip) shareTooltip;
  items: Observable<any[]>;

  public id = 'YRecSdDw7Y4';
  public session: string;
  public user: string;
  public lastUser: string;
  public state = 2;
  public inputSession: string;
  public link: string;
  public disableShareTooltip = true;
  public cinema = false;
  public pin = -1;
  public oldPin = -1;

  private player;
  private playing = false;
  private currentTime = 0;
  private refreshing = false;
  private timestamp;

  constructor(
    private gdpr: MatSnackBar,
    private location: Location,
    private ref: ChangeDetectorRef,
    private route: ActivatedRoute,
    private db: AngularFireDatabase,
    private cloudStore: AngularFirestore,
    public dialog: MatDialog) {
  }

  ngOnInit() {
    this.user = Math.random().toString(36).substring(2, 15);
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    this.route.paramMap.subscribe(params => {
      if (params && params.get('session')) {
        this.inputSession = params.get('session');
        this.checkSession(this.inputSession);
      }
    });
  }

  subscribe() {
    this.gdpr.openFromComponent(GdprComponent, {
      duration: 0,
    });
    const that = this;
    this.db.database.ref('sessions/' + this.session + '_' + this.pin).on('value', (snap) => {
      that.sharedVideoStateChanges(snap);
    });
  }

  enterInSession(session) {
    this.session = session;
    this.subscribe();
    this.link = 'https://calufy.com/' + this.session + '_' + this.pin;
    this.location.go(this.session);
    this.ref.detectChanges();
  }

  setNewSession() {
    this.db.database.ref('sessions/' + this.inputSession + '_' + this.pin).set({
      id: this.id,
      state: this.state,
      currentTime: this.currentTime,
      user: this.user,
      timestamp: Date.now()
    }).then((snap) => {
      this.enterInSession(this.inputSession);
    }).catch((snap) => {
      this.enterPinDialog();
    });
  }

  checkSession(session) {
    if (session) {
      this.db.database.ref('sessions/' + session + '_' + this.pin).once('value').then((snap) => {
        if (snap.val()) {
          this.enterInSession(session);
        } else {
          this.setNewSession();
        }
      });
    }
  }

  sharedVideoStateChanges(snapshot) {
    snapshot = snapshot.val();
    console.log(snapshot);
    if (snapshot.id && snapshot.id !== this.id) {
      this.id = snapshot.id;
      this.ref.detectChanges();
    }
    if (snapshot.timestamp) {
      this.timestamp = snapshot.timestamp;
    }
    if (snapshot.user) {
      this.lastUser = snapshot.user;
    }
    if (snapshot.pin) {
      this.pin = snapshot.pin;
    }
    if (this.user !== snapshot.user) {
      if (snapshot.currentTime
        && (!this.between(this.player.getCurrentTime(), snapshot.currentTime - 1, snapshot.currentTime + 1))) {
        this.refreshing = true;
        const difference = (Date.now() - this.timestamp) / 1000;
        this.player.seekTo(snapshot.currentTime - difference);
      }
      if (snapshot.state && this.state !== snapshot.state) {
        switch (snapshot.state) {
          case 1:
            this.refreshing = true;
            this.player.playVideo();
            break;
          case 2:
            this.refreshing = true;
            this.player.pauseVideo();
            break;
          case 3:
            break;
          default:
            break;
        }
      }
    }
    this.ref.detectChanges();
  }

  updateVideoState() {
    const currentState = this.player.getPlayerState();
    if (currentState === 1 || currentState === 2) {
      this.state = this.player.getPlayerState();
    }
    this.currentTime = this.player.getCurrentTime();
    const userRef = this.db.database.ref('sessions/' + this.session + '_' + this.pin);
    if (!this.refreshing) {
      userRef.update({
        id: this.id,
        state: this.state,
        currentTime: this.currentTime,
        user: this.user,
        timestamp: Date.now()
      }).then(() => {
        this.refreshing = false;
      }).catch();
    } else {
      setTimeout(() => {
        this.refreshing = false;
      }, 500);
    }
  }

  updatePin() {
    const oldSession = this.db.database.ref('sessions/' + this.session + '_' + this.oldPin);
    this.db.database.ref('sessions/' + this.session + '_' + this.pin).set({
      id: this.id,
      state: this.state,
      currentTime: this.currentTime,
      user: this.user,
      timestamp: Date.now()
    }).then((snap) => {
      oldSession.remove().then(() => {
        this.enterInSession(this.session);
      });
    }).catch((error) => {
      console.log('error =)', error);
    });
  }

  enterPinDialog(): void {
    const dialogRef = this.dialog.open(EnterPinComponent, {
      width: '250px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      // tslint:disable-next-line:radix
      result = parseInt(result);
      if (result && result !== this.pin) {
        this.db.database.ref('sessions/' + this.inputSession + '_' + this.pin).once('value').then(() => {
          this.pin = result;
          this.enterInSession(this.inputSession);
        }).catch(() => {
          this.enterPinDialog();
        });
      }
    });
  }

  changePinDialog(): void {
    const dialogRef = this.dialog.open(PinComponent, {
      width: '250px',
      data: {pin: this.pin}
    });
    dialogRef.afterClosed().subscribe(result => {
      // tslint:disable-next-line:radix
      result = parseInt(result);
      if (result && result !== this.pin) {
        this.oldPin = this.pin;
        this.pin = result;
        this.updatePin();
      }
    });
  }

  savePlayer(player) {
    this.player = player.target;
    this.player.hideVideoInfo();
  }

  toggleVideo() {
    const state = this.player.getPlayerState();
    if (state !== 1) {
      this.player.playVideo();
      this.playing = true;
      this.updateVideoState();
    } else {
      this.player.pauseVideo();
      this.playing = false;
      this.updateVideoState();
    }
  }

  between(x, min, max): boolean {
    return x >= min && x <= max;
  }

  shareLink() {
    this.disableShareTooltip = false;
    this.ref.detectChanges();
    this.shareTooltip.show();
    setTimeout(() => {
      this.shareTooltip.hide();
      this.disableShareTooltip = true;
    }, 2000);
  }

  toggleCinema() {
    this.cinema = !this.cinema;
  }

  github() {
    window.location.href = 'https://github.com/calufy/calufy-web';
  }
}


@Component({
  selector: 'app-enter-pin',
  templateUrl: 'enter-pin.html',
  styles: [`
      .mat-dialog-content {
          text-align: center;
      }

      .mat-dialog-actions {
          justify-content: space-around;
      }

      .mat-button {
          font-weight: 400;
      }

      .enter-button:focus {
          color: white !important;
          background: #4ed580;
      }
  `],
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

@Component({
  selector: 'app-pin',
  templateUrl: 'pin.html',
  styles: [`
      .mat-dialog-content {
          text-align: center;
      }

      .mat-dialog-actions {
          justify-content: space-around;
      }

      .mat-button {
          font-weight: 400;
      }

      .change-button:focus {
          color: white !important;
          background: #4ed580;
      }
  `],
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

@Component({
  selector: 'app-gdpr',
  templateUrl: 'gdpr.html',
  styles: [`
      .gdpr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 19px;
          line-height: 20px;
          opacity: 1;
      }

      a {
          color: #53ad82;
          text-decoration: none;
      }

      button {
          margin-right: -10px;
      }
  `],
})
export class GdprComponent {
  constructor(private gdpr: MatSnackBar) {
  }

  public dismiss() {
    this.gdpr.dismiss();
  }
}
