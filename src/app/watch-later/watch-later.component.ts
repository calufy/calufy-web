import {Component, Inject, OnInit, ViewEncapsulation} from '@angular/core';
import {MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef} from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-watch-later',
  templateUrl: './watch-later.component.html',
  styleUrls: ['./watch-later.component.scss'],
  encapsulation: ViewEncapsulation.None
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
