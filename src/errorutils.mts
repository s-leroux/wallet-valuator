import { logger } from "./debug.mjs";
import { ErrorCode } from "./errcode.mjs";
import { Tag } from "./error.mjs";

const log = logger("error");

export function Tracked<E extends Error, R extends unknown[]>(
  errCode: ErrorCode,
  ctor: new (...rest: R) => E,
  ...rest: R
) {
  const err: E & Tag = new ctor(...rest);
  err.errCode = errCode;

  return err;
}

export function Logged<E extends Error, R extends unknown[]>(
  errCode: ErrorCode,
  ctor: new (...rest: R) => E,
  ...rest: R
) {
  const err: E & Tag = new ctor(...rest);
  err.errCode = errCode;
  log.error(errCode, err.message);

  return err;
}
