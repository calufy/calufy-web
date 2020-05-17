import {Component, Inject, OnInit, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-share',
  templateUrl: './share.component.html',
  styleUrls: ['./share.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ShareComponent implements OnInit {
  public link;
  public code;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit(): void {
    if (this.data && this.data.code) {
      this.code = this.data.code;
      this.link = 'https://calufy.com/' + this.code;
    }
  }

}
