declare module 'object-hash' {
  interface HashOptions {
    algorithm?: string;
    encoding?: string;
    excludeValues?: boolean;
    ignoreUnknown?: boolean;
    unorderedArrays?: boolean;
    unorderedSets?: boolean;
    unorderedObjects?: boolean;
    respectType?: boolean;
    respectFunctionNames?: boolean;
    respectFunctionProperties?: boolean;
    replacer?: (value: unknown) => unknown;
    [key: string]: unknown;
  }

  function hash(value: unknown, options?: HashOptions | string): string;
  function hash(value: unknown, options?: HashOptions | string): string;

  export = hash;
}
