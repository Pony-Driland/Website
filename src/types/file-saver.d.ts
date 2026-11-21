declare module 'file-saver' {
  export function saveAs(
    data: Blob | string | null,
    filename?: string,
    options?: { autoBom?: boolean },
  ): void;
}
