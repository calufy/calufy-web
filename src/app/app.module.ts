import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {YouTubePlayerModule} from '@angular/youtube-player';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {PlayerComponent} from './player/player.component';
import {AngularFireModule} from '@angular/fire';
import {AngularFireDatabaseModule} from '@angular/fire/database';
import {environment} from '../environments/environment';
import {MatCardModule} from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatDialogModule} from '@angular/material/dialog';
import {HttpClientModule} from '@angular/common/http';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {GdprComponent} from './gdpr/gdpr.component';
import {WatchLaterComponent} from './watch-later/watch-later.component';
import {HomeComponent} from './home/home.component';
import {NgxMaskModule} from 'ngx-mask';
import {ShareComponent} from './share/share.component';

@NgModule({
  declarations: [
    AppComponent,
    PlayerComponent,
    GdprComponent,
    WatchLaterComponent,
    HomeComponent,
    ShareComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    YouTubePlayerModule,
    MatButtonModule,
    MatInputModule,
    MatToolbarModule,
    MatIconModule,
    FormsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    MatCardModule,
    MatListModule,
    ClipboardModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    HttpClientModule,
    MatAutocompleteModule,
    ReactiveFormsModule.withConfig({warnOnNgModelWithFormControl: 'never'}),
    NgxMaskModule.forRoot(),
    MatBottomSheetModule
  ],
  entryComponents: [WatchLaterComponent, ShareComponent],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
