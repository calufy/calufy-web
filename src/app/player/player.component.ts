import {ChangeDetectorRef, Component, Inject, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AngularFireDatabase} from '@angular/fire/database';
import {Observable} from 'rxjs';
import {MatTooltip} from '@angular/material/tooltip';
import {Location} from '@angular/common';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import {AngularFirestore} from '@angular/fire/firestore';
import {NgxSpinnerService} from 'ngx-spinner';
import {VideoSearch, YoutubeService} from '../youtube.service';
import {debounceTime, switchMap} from 'rxjs/operators';
import {FormControl} from '@angular/forms';
import {MAT_BOTTOM_SHEET_DATA, MatBottomSheet, MatBottomSheetRef} from '@angular/material/bottom-sheet';

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

  constructor(
    private gdpr: MatSnackBar,
    private location: Location,
    private ref: ChangeDetectorRef,
    private route: ActivatedRoute,
    private db: AngularFireDatabase,
    private cloudStore: AngularFirestore,
    public dialog: MatDialog,
    private spinner: NgxSpinnerService,
    private youTubeService: YoutubeService,
    private bottomSheet: MatBottomSheet) {
  }
  @ViewChild(MatTooltip) shareTooltip;

  public id = 'YRecSdDw7Y4';
  public session: string;
  public user: string;
  public lastUser: string;
  public state = 2; // 1 = playing | 2 = paused
  public prevState = 2;
  public inputSession: string;
  public link: string;
  public disableShareTooltip = true;
  public cinema = false;
  public pin = -1;
  public oldPin = -1;
  public videoSearchCtrl = new FormControl();
  public filteredVideoSearch: Observable<VideoSearch[]>;
  public watchLaterVideos: VideoSearch[] = [];

  private player;
  private playing = false;
  private currentTime = 0;
  private refreshing = false;
  private timestamp;

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
    this.filteredVideoSearch = this.videoSearchCtrl.valueChanges.pipe(
      debounceTime(150),
      switchMap((search: string) => {
        return (search) ? this.youTubeService
          .getVideosFromUrl(search) : [];
      })
    );
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

  setNewSession() {
    this.videoSearchCtrl.setValue('https://www.youtube.com/watch?v=' + this.id);
    this.db.database.ref('sessions/' + this.inputSession + '_' + this.pin).set({
      id: this.id,
      state: this.state,
      currentTime: this.currentTime,
      user: this.user,
      timestamp: Date.now()
    }).then(() => {
      this.enterInSession(this.inputSession);
    }).catch(() => {
      this.enterPinDialog();
    });
  }

  enterInSession(session) {
    this.session = session;
    const that = this;
    this.db.database.ref('sessions/' + this.session + '_' + this.pin).on('value', (snap) => {
      that.sharedVideoStateChanges(snap);
    });
    this.gdpr.openFromComponent(GdprComponent, {
      duration: 0,
    });
    this.link = 'https://calufy.com/' + this.session + '_' + this.pin;
    this.location.go(this.session);
    this.ref.detectChanges();
  }


  sharedVideoStateChanges(snapshot) {
    snapshot = snapshot.val();
    if (snapshot.id && snapshot.id !== this.id) {
      this.setId(snapshot.id);
      this.ref.detectChanges();
    }
    if (snapshot.timestamp) {
      this.timestamp = snapshot.timestamp;
    }
    if (snapshot.currentTime) {
      this.currentTime = snapshot.currentTime;
    }
    if (snapshot.user) {
      this.lastUser = snapshot.user;
    }
    if (this.user !== snapshot.user) {
      if (!this.player) {
        const checkPlayer = setInterval(() => {
          if (this.player) {
            clearInterval(checkPlayer);
            this.getPlayerStatus(snapshot);
          }
        }, 100);
      } else {
        this.getPlayerStatus(snapshot);
      }
    }
    this.ref.detectChanges();
  }

  getPlayerStatus(snapshot) {
    if (!this.player.getCurrentTime()) {
      this.refreshing = true;
      this.player.seekTo(snapshot.currentTime);
    }
    if (this.player.getCurrentTime() &&
      snapshot.currentTime &&
      !this.between(this.player.getCurrentTime(), snapshot.currentTime - 1, snapshot.currentTime + 1)) {
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

  setPlayerStatus() {
    const currentState = this.player.getPlayerState();
    if (currentState === 0 && this.watchLaterVideos.length > 0) {
      this.nextVideo(this.watchLaterVideos.shift().id);
    } else {
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
  }

  savePlayer(player) {
    this.player = player.target;
    this.player.hideVideoInfo();
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


  toggleVideo() {
    const state = this.player.getPlayerState();
    if (state !== 1) {
      this.player.playVideo();
      this.playing = true;
      this.setPlayerStatus();
    } else {
      this.player.pauseVideo();
      this.playing = false;
      this.setPlayerStatus();
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

  setId(videoId: string) {
    this.id = videoId;
    this.videoSearchCtrl.setValue('https://www.youtube.com/watch?v=' + videoId);
    this.ref.detectChanges();
  }

  nextVideo(videoId: string) {
    this.setId(videoId);
    this.player.playVideo();
  }

  checkInputEmpty() {
    if (!this.videoSearchCtrl.value) {
      this.videoSearchCtrl.setValue('https://www.youtube.com/watch?v=' + this.id);
    }
  }

  addToList(event, video) {
    event.stopPropagation();
    this.watchLaterVideos.push(video);
    this.openList(1000);
  }

  openList(duration) {
    this.bottomSheet.open(WatchLaterComponent, {
      data: {
        watchLaterVideos: this.watchLaterVideos,
        duration
      }
    }).afterDismissed().subscribe((response) => {
      if (response) {
        switch (response.action) {
          case 'remove':
            this.watchLaterVideos = this.watchLaterVideos.filter(watchLaterVideo => watchLaterVideo !== response.video);
            this.openList(0);
            break;
          case 'play':
            this.setId(response.video.id);
            break;
          case 'autoDismiss':
          case 'default':
            break;
        }
      }
    });
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

@Component({
  selector: 'app-watch-later',
  templateUrl: 'watch-later.html',
  styles: [`
      .empty-list {
          text-align: center;
      }

      .watch-later-list:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, .08);
      }

      .watch-later-list-img {
          order: -1;
          margin-right: 20px;
          height: 68px;
      }

      .remove-button {
          color: #96969661;
      }
  `],
})
export class WatchLaterComponent implements OnInit {
  constructor(private bottomSheetRef: MatBottomSheetRef<WatchLaterComponent>, @Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
  }

  playVideo(event, video): void {
    event.preventDefault();
    this.bottomSheetRef.dismiss({
      action: 'play',
      video
    });
  }

  removeVideo(event, video): void {
    event.preventDefault();
    event.stopPropagation();
    this.bottomSheetRef.dismiss({
      action: 'remove',
      video
    });
  }

  ngOnInit(): void {
    if (this.data.duration !== 0) {
      setTimeout(() => {
        this.bottomSheetRef.dismiss({
          action: 'autoDismiss',
          video: null
        });
      }, this.data.duration);
    }
  }
}
