import {ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {AngularFireDatabase} from '@angular/fire/database';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {SessionService} from '../session.service';
import {FormControl} from '@angular/forms';
import {ShareComponent} from '../share/share.component';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {
  public inputSession = new FormControl();
  public id = 'YRecSdDw7Y4';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private db: AngularFireDatabase,
    private location: Location,
    private ref: ChangeDetectorRef,
    private sessionService: SessionService,
    public dialog: MatDialog,
  ) {
  }

  ngOnInit(): void {
    this.sessionService.setSession(null);
  }

  uniqid() {
    const a = (Date.now() / 1000).toString(16).split('.').join('');
    const b = Math.round(Math.random() * 100000);
    const val = a + b;
    return val.slice(0, 4) + '-' + val.slice(8, 12) + '-' + val.slice(12, 16);
  }

  checkSession() {
    if (this.inputSession.value && this.inputSession.valid) {
      const session =
        this.inputSession.value.slice(0, 4) + '-' + this.inputSession.value.slice(4, 8) + '-' + this.inputSession.value.slice(8, 12);
      const sessionService = this.sessionService.checkSession(session);
      if (sessionService.session) {
        this.router.navigate([session]);
      } else {
        sessionService.response.then((snap) => {
          if (snap.val()) {
            this.sessionService.setSession(session);
            this.router.navigate([session]);
          } else {
            this.inputSession.setErrors(({incorrect: true}));
          }
        });
      }
    }
  }

  setNewSession() {
    const session = this.uniqid();
    this.db.database.ref('sessions/' + session).set({
      id: this.id,
      state: 2,
      currentTime: 0,
      user: this.sessionService.getUser(),
      timestamp: Date.now()
    }).then(() => {
      this.sessionService.setSession(session);
      this.router.navigate([session]);
      this.dialog.open(ShareComponent, {
        data: {
          code: session
        }
      });
    }).catch(() => {
      this.setNewSession();
    });
  }

}
