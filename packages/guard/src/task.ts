export interface ITaskFormat {
  width: number;
  height: number;
  frames: number;
  fps: {
    numerator: number;
    denominator: number;
  };
  formatName: string;
  colorFamily: string;
  bitDepth: number;
}

export interface ITaskProgress {
  processedFrames: number;
  processedDurationMs: number;
  fps: number;
  currentBitrate: number;
  outputBytes: number;
  speed: number;
}
