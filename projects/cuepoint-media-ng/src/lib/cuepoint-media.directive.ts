import { Directive, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CuepointMediaData } from './typings';


@Directive({
  selector: '[a13CuepointMedia]'
})
export class CuepointMediaDirective implements OnChanges {

  /**
   * Emits cuepoint data when the media's currentTime matches the cuepoints time and cpListen is set to true.
   * The cuepoint's optional function will execute at the same time as the event.
   */
  @Output() cuepointEvent: EventEmitter<CuepointMediaData> = new EventEmitter();

  /**
   * CuepointMediaData: { time: number,  kind: 'event' | 'nav' | 'both',  name: string,  func?: () => void }
   * Cuepoints are automatically sorted by thier time property.
   */
  @Input() cuepoints!: CuepointMediaData[];

  /**
   * EventListeners are added when set to true,  and eventListeners are removed when set to false.
   */
  @Input() cpListen!: boolean;

  /**
   * Time in seconds that is used to specify a range of time when a cuepoint can be detected and cuepointEvent emitted.
   * 
   * The timing of detecting cuepoints or navigating to a cuepoints specific time is not perfect. 
   * Seeking can only happen on the media's comperssion key frames, and a key frame's time may not exacly match the cuepoint's time.
   * Also, device playback capabilities can play a role.
   * The default, 0.3, creates a large enough spread to work for most devices. 
   * If cuepoints are missed, increase this number.
   */
  @Input() tolerance = 0.3;

  /**
   * A cuepoint is searched for who's name matches this value when set, then, if found,
   * the media's currentTime will seek the cuepoint's time and a cuepointEvent will emit.
   * This will only work for cuepoints that have the kind property value is 'nav' or 'both'.
   */
  @Input() goToName!: string;

  /**
   * If a cuepoint at the index exists the media's currentTime will seek the cuepoint's time and a cuepointEvent will emit.
   * This will work for all cuepoints regardless of thier kind property's value.
   */
  @Input() goToIndex!: number;

  /**
   * The media's currentTime will seek this number when set. 
   * Does not loook a cuepoints time to match.
   */
  @Input() goToTime!: number;

  private media!: HTMLMediaElement;
  private hasListeners = false;
  private rafID!: number;
  private length!: number;
  private index!: number;
  private navTimer!: number;
  private mode: 'event' | 'nav' = 'event';
  private curCuepoint!: CuepointMediaData | undefined;
  private eventCuepoint!: CuepointMediaData;
  private navCuepoint!: CuepointMediaData | undefined;

  private seekedCallback!: EventListener;
  private playingCallback!: EventListener;
  private updateCallback!: FrameRequestCallback;
  
  private isAndroid = (() => {
    if (window.navigator.platform && window.navigator.platform === 'Android') return true;
    else if (window.navigator.userAgent.toLowerCase().search('android') !== -1) return true;
    else if (window.navigator.appVersion.toLowerCase().search('android') !== -1) return true;
    else return false;
  })();

  constructor(private el: ElementRef) {
    this.media = this.el.nativeElement;
    this.seekedCallback = () => this.onMediaSeeked();
    this.playingCallback = () => this.onMediaPlaying();
    this.updateCallback = () => this.update();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log('CuepointMediaDirective.ngOnChanges)', changes);
    if (changes.cuepoints?.currentValue) {
      this.cuepoints.sort((a, b) => a.time - b.time);
      this.length = this.cuepoints.length;
    }
    //
    if (changes.cpListen) {
      if (this.cpListen && !this.hasListeners)  this.addListeners();
      else if (!this.cpListen && this.hasListeners) this.removeListeners();
    }
    //
    if (changes.goToName?.currentValue) {
      this.seekCuepoint(this.goToName);
    }
    //
    if (changes.goToIndex?.currentValue) {
      this.seekCuepoint(this.goToIndex);
    }
    //
    if (changes.goToTime?.currentValue) {
      this.media.currentTime = this.goToTime;
    }
  }

  private onCuepoint(cuepoint: CuepointMediaData): void {
    // console.log('CuepointMediaDirective.onCuepoint()', cuepoint);
    this.curCuepoint = cuepoint;
    this.cuepointEvent.emit(cuepoint);
    if (cuepoint.func) cuepoint.func.apply(window, []);
    this.mode = 'event';
    if (this.hasListeners) this.rafID = requestAnimationFrame(this.updateCallback);
  }

  private seekCuepoint(nameOrIndex: string | number): void {
    /* console.log('CuepointMediaDirective.seekCuepoint()', nameOrIndex; */
    this.navCuepoint = typeof nameOrIndex === 'string' 
      ? this.cuepoints.find(cp => cp.name === nameOrIndex) 
      : this.cuepoints[nameOrIndex];
    //
    if (this.navCuepoint?.kind === 'nav' || this.navCuepoint?.kind === 'both' || typeof nameOrIndex === 'number') {
      this.mode = 'nav';
      if (this.navCuepoint) this.media.currentTime = this.navCuepoint.time;
    } else {
      this.navCuepoint = undefined;
    }
  }

  /**
   *  "seeked" event unreliable on Android add "seeking" listener to help out
   */
  private addListeners(): void {
    // console.log('CuepointMediaDirective.addListeners()');
    this.hasListeners = true;
    this.media.addEventListener('seeked', this.seekedCallback, false);
    if (this.isAndroid) this.media.addEventListener('seeking', this.seekedCallback, false);
    this.media.addEventListener('playing', this.playingCallback, false);
    if (!this.media.paused) this.rafID = requestAnimationFrame(this.updateCallback);

  }

  private removeListeners(): void {
    // console.log('CuepointMediaDirective.removeListeners()');
    this.hasListeners = false;
    this.media.removeEventListener('seeked', this.seekedCallback);
    this.media.removeEventListener('seeking', this.seekedCallback);
    this.media.removeEventListener('playing', this.playingCallback);
    cancelAnimationFrame(this.rafID);
  }

  private onMediaSeeked(): void {
    // console.log('CuepointMediaDirective.onMediaSeeked()');
    if (this.mode === 'nav' && this.navCuepoint) this.navTimer = window.setInterval(() => this.onNavTimer(), 17);
  }

  private onNavTimer(): void {
    if (this.navCuepoint) {
      if (this.media.currentTime >= (this.navCuepoint.time - this.tolerance) && this.media.currentTime < (this.navCuepoint.time + this.tolerance)) {
        this.onCuepoint(this.navCuepoint);
        this.navCuepoint = undefined;
      }
    } else {
      clearInterval(this.navTimer);
    }
  }

  private onMediaPlaying(): void {
    // console.log('CuepointMediaDirective.onMediaPlaying()');
    if (this.curCuepoint && this.curCuepoint.time > (this.media.currentTime + this.tolerance)) this.curCuepoint = undefined;
    if (this.hasListeners) this.rafID = requestAnimationFrame(this.updateCallback);

  }

  private update(): void {
    if (this.media.paused || this.media.ended) return;
    //
    if (this.length && this.mode === 'event') {
      //
      for (this.index = 0; this.length > this.index; this.index++) {
        this.eventCuepoint = this.cuepoints[this.index];
        //
        if (this.eventCuepoint !== this.curCuepoint && (this.eventCuepoint.kind === 'event' || this.eventCuepoint.kind === 'both')) {
          //
          if (this.media.currentTime >= this.eventCuepoint.time && this.media.currentTime < (this.eventCuepoint.time + this.tolerance)) {
            this.onCuepoint(this.eventCuepoint);
            break;
          }
        }
      }
    }
    if (this.hasListeners) this.rafID = requestAnimationFrame(this.updateCallback);
  }

}
