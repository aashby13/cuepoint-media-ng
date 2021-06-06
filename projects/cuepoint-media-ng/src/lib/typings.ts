export declare type CuepointMediaData = {
  time: number,
  kind: 'event' | 'nav' | 'both',
  name: string,
  func?: () => void
};
