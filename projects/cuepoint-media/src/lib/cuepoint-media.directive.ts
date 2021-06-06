import { Directive, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CuepointMediaData } from './typings';


@Directive({
  selector: '[libCuepointMedia]'
})
export class CuepointMediaDirective implements OnInit, OnChanges {

  @Output() cuepointEvent: EventEmitter<CuepointMediaData> = new EventEmitter();
  @Input() listen!: boolean;
  @Input() cuepoints!: CuepointMediaData[];
  @Input() tolerance: number = 0.3;
  @Input() goTo!: string;

  private media!: HTMLMediaElement;
  private hasListeners: boolean = false;
  private isAndroid!: boolean;
  private rafID!: number;
  private length!: number;
  private index!: number;
  private navTimer!: number
  private mode: 'event' | 'nav' = 'event';
  private curCuepoint!: CuepointMediaData | undefined;
  private eventCuepoint!: CuepointMediaData;
  private navCuepoint!: CuepointMediaData | undefined;
  private seekedCallback!: EventListener;
  private playingCallback!: EventListener;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.media = this.el.nativeElement;
    this.seekedCallback = () => this.onMediaSeeked();
    this.playingCallback = () => this.onMediaPlaying();
    this.isAndroid = (() => {
      if (window.navigator.platform && window.navigator.platform === 'Android') return true;
      else if (window.navigator.userAgent.toLowerCase().search('android') !== -1) return true;
      else if (window.navigator.appVersion.toLowerCase().search('android') !== -1) return true;
      else return false;
    }) ();
    console.log(this.media, this.isAndroid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('CuepointMediaDirective.ngOnChanges)', changes);
    if (changes.cuepoints?.currentValue) {
      this.cuepoints.sort((a, b) => a.time - b.time);
      this.length = this.cuepoints.length;
    }
    //
    if (changes.listen) {
      if (this.listen && !this.hasListeners)  this.addListeners();
      else if (!this.listen && this.hasListeners) this.removeListeners();
    }
    //
    if (changes.goTo?.currentValue) {
      this.seekCuepoint(this.goTo);
    }
  }

  private onCuepoint(cuepoint: CuepointMediaData): void {
    console.log('CuepointMediaDirective.onCuepoint()', cuepoint);
    this.curCuepoint = cuepoint;
    this.cuepointEvent.emit(cuepoint);
    if (cuepoint.func) cuepoint.func.apply(window, []);
    this.mode = 'event';
    if (this.hasListeners) this.rafID = requestAnimationFrame(() => this.update());
  }

  private seekCuepoint(name: string): void {
    console.log('CuepointMediaDirective.seekCuepoint()', name);
    const cp = this.cuepoints.find(cp => cp.name === name);
    if (cp?.kind === 'nav' || cp?.kind === 'both') {
      this.navCuepoint = cp;
      this.mode = 'nav';
      this.media.currentTime = this.navCuepoint.time;
    }
  }

  /**
   *  "seeked" event unreliable on Android add "seeking" listener to help out
   */
  private addListeners(): void {
    console.log('CuepointMediaDirective.addListeners()');
    this.hasListeners = true;
    this.media.addEventListener('seeked', this.seekedCallback, false);
    if (this.isAndroid) this.media.addEventListener('seeking', this.seekedCallback, false);
    this.media.addEventListener('playing', this.playingCallback, false);
    if (!this.media.paused) this.rafID = requestAnimationFrame(() => this.update());

  }

  private removeListeners(): void {
    console.log('CuepointMediaDirective.removeListeners()');
    this.hasListeners = false;
    this.media.removeEventListener('seeked', this.seekedCallback);
    this.media.removeEventListener('seeking', this.seekedCallback);
    this.media.removeEventListener('playing', this.playingCallback);
    cancelAnimationFrame(this.rafID);
  }

  private onMediaSeeked(): void {
    console.log('CuepointMediaDirective.onMediaSeeked()');
    if (this.mode === 'nav' && this.navCuepoint) this.navTimer = window.setInterval(() => this.onNavTimer(), 17);
  }

  private onNavTimer(): void {
    if (this.navCuepoint) {
      if (this.media.currentTime >= (this.navCuepoint.time - 0.2) && this.media.currentTime < (this.navCuepoint.time + this.tolerance)) {
        this.onCuepoint(this.navCuepoint);
        this.navCuepoint = undefined;
      }
    } else {
      clearInterval(this.navTimer);
    }
  }

  private onMediaPlaying(): void {
    console.log('CuepointMediaDirective.onMediaPlaying()');
    if (this.curCuepoint && this.curCuepoint.time > (this.media.currentTime - this.tolerance)) this.curCuepoint = undefined;
    if (this.hasListeners) this.rafID = requestAnimationFrame(() => this.update());

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
    if (this.hasListeners) this.rafID = requestAnimationFrame(() => this.update());
  }

}
