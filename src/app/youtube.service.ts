import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {from, Observable} from 'rxjs';
import {AngularFireDatabase} from '@angular/fire/database';

export interface VideoSearch {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {

  apiKey = 'AIzaSyDUEfql1nB05gSWmjOX73gnm6It2dI1R9E'; // 'AIzaSyC6kHFaoLS3cTaIKaWwt2osvOJlbqnxuR8';

  constructor(public http: HttpClient, private db: AngularFireDatabase) {
  }

  getVideosFromUrl(videoUrl): Observable<any> {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    const id = (match && match[7].length === 11) ? match[7] : false;

    return from(this.db.database.ref('videos/' + id).once('value').then((snap) => {
      if (snap.val()) {
        const cachedVideo = snap.val();
        const video: VideoSearch = {
          id: cachedVideo.id,
          title: cachedVideo.title,
          channel: cachedVideo.channel,
          thumbnail: cachedVideo.thumbnail
        };
        return [video];
      } else {
        console.log('Is not in cache');
        return this.getFromYoutube(id).toPromise().then(videos => {
          return videos;
        });
      }
    }));
  }

  private getFromYoutube(id: string) {
    const url = 'https://www.googleapis.com/youtube/v3/videos?key=' + this.apiKey +
      '&id=' + id +
      '&part=snippet &type=video&maxResults=1';
    return this.http.get(url)
      .pipe(map((response: any) => {
        const videos = [];
        if (response) {
          response.items.forEach((item) => {
            const video: VideoSearch = {
              id,
              title: item.snippet.title.replace(/&quot;/g, '\"'),
              channel: item.snippet.channelTitle.replace(/&quot;/g, '\"'),
              thumbnail: item.snippet.thumbnails.default.url
            };
            videos.push(video);
            this.saveInChache(video);
          });
        }
        return videos;
      }));
  }

  private saveInChache(video: VideoSearch) {
    this.db.database.ref('videos/' + video.id).set({
      id: video.id,
      title: video.title,
      channel: video.channel,
      thumbnail: video.thumbnail
    }).then().catch();
  }

}
