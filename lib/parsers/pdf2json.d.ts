declare module 'pdf2json' {
  export class PDFParser {
    parseBuffer(buffer: Buffer, callback: (err: any, data: any) => void): void;
  }
}
