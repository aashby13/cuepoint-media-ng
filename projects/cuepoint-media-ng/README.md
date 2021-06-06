# CuepointMediaNg

An Angular directive for HTML Media Elements that enables the use of cue points to trigger events via playback and time navigation.

`npm i cuepoint-media-ng`

## How To Use
`selector: '[a13CuepointMedia]'`


---
`@Output() cuepointEvent: EventEmitter<CuepointMediaData> = new EventEmitter();`

- Emits cuepoint data when the media's currentTime matches the cuepoints time and cpListen is set to true.
- The cuepoint's optional function will execute at the same time as the event.
- Nav cuepoints only trigger an emit when seeked, ie: goToName


---
`@Input() cuepoints!: CuepointMediaData[];`

- CuepointMediaData: `{ time: number,  kind: 'event' | 'nav' | 'both',  name: string,  func?: () => void }`
- Cuepoints are automatically sorted by thier time property.


---
`@Input() cpListen!: boolean;`

- EventListeners are added when set to true and removed when set to false.


---
`@Input() tolerance = 0.3;`

- Time in seconds that is used to specify a range of time when a cuepoint can be detected and cuepointEvent emitted.
- The timing of detecting cuepoints or navigating to a cuepoints specific time is not perfect. 
   * Seeking can only happen on the media's compression key frames, and a key frame's time may not exactly match the cuepoint's time.
   * Also, device playback capabilities can play a role.
   * The default, 0.3, creates a large enough spread to work for most devices. 
   * If cuepoints are missed, increase this number.


---
`@Input() goToName!: string;`

- A cuepoint is searched for who's name matches this value when set, then, if found, the media's currentTime will seek the cuepoint's time and a cuepointEvent will emit.
- This will only work for cuepoints where the kind property value is equal to 'nav' or 'both'.


---
`@Input() goToIndex!: number;`
- If a cuepoint at the index exists the media's currentTime will seek to the cuepoint's time and a cuepointEvent will emit.
- This will work for all cuepoints regardless of thier kind property's value.


---
`@Input() goToTime!: number;`
- The media's currentTime will seek this number when set. 
- Does not loook a cuepoints time to match.


---
## Simple Example Component

[link to example repo](https://github.com/aashby13/test-project-cuepoint-media-ng)

```
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CuepointMediaData } from 'cuepoint-media-ng';

@Component({
  selector: 'app-root',
  template: `
    <div class="wrap">
      <video
        #video
        controls
        a13CuepointMedia
        [cuepoints]="cuepoints"
        [cpListen]="listenForCP"
        [goToName]="seekName"
        [goToIndex]="seekIndex"
        (cuepointEvent)="onCuePoint($event)"
        src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
      </video>

      <div class="btn-wrap">
        <button (click)="incrementIndex()">Index++</button>
        <button (click)="gotToCuepoint('Two')">Go To Cuepoint Two</button>
        <button (click)="gotToCuepoint('Four')">Go To Cuepoint Four</button>
        <button (click)="gotToCuepoint('Five')">Go To Cuepoint Five</button>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  @ViewChild('video', {static: true}) videoRef!: ElementRef;
  cuepoints!: CuepointMediaData[];
  listenForCP = true;
  seekName!: string;
  seekIndex = -1;

  constructor() {}

  ngOnInit(): void {
    this.cuepoints = [
      {
        name: 'One',
        time: 10,
        kind: 'event',
        func: () => console.log('This is cuepoint One. EVENT!')
      },
      {
        name: 'Two',
        time: 20,
        kind: 'both',
        func: () => console.log('This is cuepoint Two. BOTH!')
      },
      {
        name: 'Three',
        time: 30,
        kind: 'event',
        func: () => {
          (this.videoRef.nativeElement as HTMLVideoElement).pause();
          setTimeout(() => {
            alert('This is cuepoint Three. EVENT!')
          }, 1000);
        }
      },
      {
        name: 'Four',
        time: 120,
        kind: 'nav',
        func: () => console.log('This is cuepoint Four. NAV!')
      },
      {
        name: 'Five',
        time: 460,
        kind: 'both',
        func: () => console.log('This is cuepoint Five. BOTH!')
      }
    ];
  }

  onCuePoint(cp: CuepointMediaData): void {
    console.log(cp);
  }

  gotToCuepoint(name: string): void {
    this.seekName = name;
  }

  incrementIndex(): void {
    if (this.seekIndex === this.cuepoints.length-1) {
      this.seekIndex = 0;
    } else {
      this.seekIndex++;
    }
    console.log(this.seekIndex);
  }
}
```
