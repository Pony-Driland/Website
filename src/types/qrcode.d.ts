declare module 'qrcode' {
  interface QRCodeToCanvasOptions {
    width?: number;
    margin?: number;
    [key: string]: unknown;
  }

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToCanvasOptions | ((error: Error | null) => void),
    callback?: (error: Error | null) => void,
  ): void;

  const QRCode: {
    toCanvas: typeof toCanvas;
  };

  export default QRCode;
}
