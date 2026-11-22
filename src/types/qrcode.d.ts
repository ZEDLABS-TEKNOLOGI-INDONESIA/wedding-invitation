declare module "qrcode" {
  export interface QRCodeRenderersOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H" | "low" | "medium" | "quartile" | "high";
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeRenderersOptions
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeRenderersOptions
  ): Promise<void>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toCanvas: typeof toCanvas;
  };
  export default QRCode;
}
