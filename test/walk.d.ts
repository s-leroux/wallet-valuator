declare module "@root/walk" {
  /**
   * Matches `@root/walk` walk.js: walkFunc is awaited; may return `false` to skip a directory.
   * Third argument is an `fs.Dirent` from `readdir(..., { withFileTypes: true })`, not a string.
   */
  export const walk: (
    pathname: string,
    walkFunc: (
      err: Error | undefined,
      pathname: string,
      dirent: import("node:fs").Dirent,
    ) => Promise<void | false | undefined>,
  ) => Promise<void>;
}
