import {Injectable} from '@angular/core';
import {AngularFireDatabase} from '@angular/fire/database';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private user: string;
  private session: string;

  constructor(
    private db: AngularFireDatabase,
  ) {
  }

  checkSession(session) {
    return {
      session: this.session,
      response: this.db.database.ref('sessions/' + session).once('value')
    };
  }

  setSession(session) {
    this.session = session;
  }

  getUser(): string {
    return this.user ? this.user : Math.random().toString(36).substring(2, 15);
  }
}
