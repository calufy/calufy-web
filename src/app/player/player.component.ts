import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AngularFireDatabase} from '@angular/fire/database';
import {Observable} from 'rxjs';
import {MatTooltip} from '@angular/material/tooltip';
import {Location} from '@angular/common';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import {AngularFirestore} from '@angular/fire/firestore';
import {NgxSpinnerService} from 'ngx-spinner';
import {VideoSearch, YoutubeService} from '../youtube.service';
import {debounceTime, switchMap} from 'rxjs/operators';
import {FormControl} from '@angular/forms';
import {MatBottomSheet} from '@angular/material/bottom-sheet';
import {WatchLaterComponent} from '../watch-later/watch-later.component';
import {GdprComponent} from '../gdpr/gdpr.component';
import {SessionService} from '../session.service';
import {ShareComponent} from '../share/share.component';
import {MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {MatSliderChange} from '@angular/material/slider';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default
})
export class PlayerComponent implements OnInit {

  @ViewChild(MatTooltip) shareTooltip;
  @ViewChild(MatAutocompleteTrigger) trigger;

  public id;
  public session: string;
  public user: string;
  public lastUser: string;
  public state = 2; // 1 = playing | 2 = paused
  public hideVideo = false;

  public player: any;
  public isRestricted = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  public duration = 0;
  public sliderFormControl = new FormControl();
  public refreshing = false;

  public loading;
  public link: string;
  public cinema = false;
  public videoSearchCtrl = new FormControl();
  public filteredVideoSearch: Observable<VideoSearch[]>;
  public watchLaterVideos: VideoSearch[] = [];
  private playing = false;
  public currentTime = 0;
  private timestamp;
  private ready = false;
  private firstTime = 3;

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
    private bottomSheet: MatBottomSheet,
    private sessionService: SessionService) {
  }

  init() {
    if (window['YT']) {
      this.startVideo();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window['onYouTubeIframeAPIReady'] = () => this.startVideo();
  }

  startVideo() {
    this.player = new window['YT'].Player('player', {
      videoId: this.id,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        controls: 1,
        disablekb: 1,
        rel: 0,
        enablejsapi: 1,
        showinfo: 0,
        fs: 0,
        playsinline: 1

      },
      events: {
        'onReady': this.onPlayerReady.bind(this),
        'onStateChange': this.onPlayerStateChange.bind(this),
        'onError': this.onPlayerError.bind(this),
      }
    });
  }

  onPlayerReady(event) {
    this.ready = true;
    this.player.hideVideoInfo();
    this.duration = this.player.getDuration();
  }

  onPlayerError(event) {
    console.log('Error: ' + event.data);
  }


  ngOnInit() {
    this.loading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    this.user = this.sessionService.getUser();
    this.route.paramMap.subscribe(params => {
      if (params && params.get('session')) {
        this.session = params.get('session');
        this.enterInSession(this.session);
      }
    });
    this.filteredVideoSearch = this.videoSearchCtrl.valueChanges.pipe(
      debounceTime(150),
      switchMap((search: string) => {
        return (search) ? this.youTubeService
          .getVideosFromUrl(search) : [];
      })
    );
    this.ref.detectChanges();
  }

  enterInSession(session) {
    const that = this;
    this.db.database.ref('sessions/' + session).on('value', (snap) => {
      that.sharedVideoStateChanges(snap);
    });
    this.gdpr.openFromComponent(GdprComponent, {
      duration: 0,
    });
    this.link = 'https://calufy.com/' + session;
    this.ref.detectChanges();
  }


  sharedVideoStateChanges(snapshot) {
    snapshot = snapshot.val();
    if (this.user !== snapshot.user) {
      this.refreshing = true;
      setTimeout(() => {
        this.refreshing = false;
      }, 500);
      if (snapshot.id && snapshot.id !== this.id) {
        this.setId(snapshot.id);
        this.init();
        this.loading = false;
        this.ref.detectChanges();
      }
      if (!this.ready) {
        const checkPlayer = setInterval(() => {
          if (this.ready) {
            clearInterval(checkPlayer);
            this.updatePlayerStatus(snapshot);
          }
        }, 100);
      } else {
        this.updatePlayerStatus(snapshot);
      }
      this.ref.detectChanges();
    }
  }

  updatePlayerStatus(snapshot) {
    if (snapshot.user) {
      this.lastUser = snapshot.user;
    }
    if (snapshot.timestamp) {
      this.timestamp = snapshot.timestamp;
    }
    const currentState = this.player.getPlayerState();
    const actualCurrentTime = this.player.getCurrentTime() ? this.player.getCurrentTime() : 0;
    if (snapshot.currentTime) {
      this.currentTime = snapshot.currentTime;
      if (!this.between(actualCurrentTime, snapshot.currentTime - 1, snapshot.currentTime + 1)){
        if (snapshot.state === 1) {
          const difference = (Date.now() - this.timestamp) / 1000;
          this.player.seekTo(snapshot.currentTime + difference);
        } else {
          this.player.seekTo(snapshot.currentTime);
        }
      }
    }
    if (snapshot.state) {
      switch (snapshot.state) {
        case 1:
          if (currentState !== 1) {
            this.player.playVideo();
            this.playing = true;
          }
          break;
        case 2:
          this.player.pauseVideo();
          this.playing = false;
          break;
        case 5:
          break;
        default:
          break;
      }
    }
  }

  onPlayerStateChange(event) {
    this.currentTime = this.player.getCurrentTime();
    const currentState = this.player.getPlayerState();
    this.state = currentState;
    if (currentState === 0 && this.watchLaterVideos.length > 0) {
      this.nextVideo(this.watchLaterVideos.shift().id);
    }
    if (!this.refreshing && this.firstTime === 0){
      this.storePlayerStatus();
    }
    if (this.firstTime > 0){
      this.firstTime = this.firstTime - 1;
    }
  }

  storePlayerStatus(){
    const userRef = this.db.database.ref('sessions/' + this.session);
    userRef.update({
      currentTime: this.currentTime,
      id: this.id,
      state: this.state,
      timestamp: Date.now(),
      user: this.user
    }).then(() => {
    }).catch();
  }

  toggleVideo() {
    const state = this.player.getPlayerState();
    if (state !== 1) {
      this.player.playVideo();
      this.playing = true;
      this.state = 1;
    } else {
      this.player.pauseVideo();
      this.playing = false;
      this.state = 2;
    }
    this.storePlayerStatus();
  }


  between(x, min, max): boolean {
    return x >= min && x <= max;
  }

  shareLink() {
    this.dialog.open(ShareComponent, {
      data: {
        code: this.session
      }
    });
  }


  toggleCinema() {
    this.cinema = !this.cinema;
    this.ref.detectChanges();
  }

  github() {
    window.location.href = 'https://github.com/calufy/calufy-web';
  }

  setId(videoId: string) {
    this.id = videoId;
    if (this.ready){
      this.player.loadVideoById(videoId);
    }
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
    this.trigger.closePanel();
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
          case 'add':
            this.trigger.openPanel();
            break;
          case 'autoDismiss':
          case 'default':
            break;
        }
      }
    });
  }
}

