import { ERRORS, type ErrorCode } from "./errcode.mjs";
import { ValueError } from "./error.mjs";

// =====================================================================
// Utility types
// =====================================================================
const id = <T extends any>(x: T) => x;

// =====================================================================
// ANSI escape code sequences
// =====================================================================
const CSI = "\x1b[";

const ANSI_SGR_RESET = "0";
const ANSI_SGR_BOLD = "1";
const ANSI_SGR_INVERT = "7";

const ANSI_3BIT_COLORS: { [color: string]: string } = {
  black: "30",
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  magenta: "35",
  cyan: "36",
  white: "37",
  bright_black: "30",
  gray: "30",
  bright_red: "31",
  bright_green: "32",
  bright_yellow: "33",
  bright_blue: "34",
  bright_magenta: "35",
  bright_cyan: "36",
  bright_white: "37",
};

type ANSI3BitColorName = keyof typeof ANSI_3BIT_COLORS;

interface SGRAttributes {
  reset?: boolean;
  fgcolor?: ANSI3BitColorName;
  bold?: boolean;
  invert?: boolean;
}

/**
 * Constructs an ANSI escape sequence using SGR (Select Graphic Rendition)
 * parameters.
 *
 * SGR stands for "Select Graphic Rendition" and is part of the ANSI escape
 * code standard (ANSI X3.64/ECMA-48).  This method builds a string that begins
 * with the Control Sequence Introducer (CSI), followed by a list of
 * semicolon-separated SGR parameters (such as reset, foreground color, bold,
 * and invert), and ends with the "m" command. The resulting escape sequence
 * instructs the terminal to change text attributes (for example, setting
 * colors, enabling bold, or inverting video).
 *
 * @param attrs - An object specifying the desired SGR attributes.
 * @returns A string containing the complete ANSI escape sequence.
 */
function sgr(attrs: SGRAttributes = {}): string {
  const parts: string[] = [];

  if (attrs.reset) {
    parts.push(ANSI_SGR_RESET);
  }

  if (attrs.fgcolor) {
    // Convert the color name to its corresponding ANSI code.
    parts.push(ANSI_3BIT_COLORS[attrs.fgcolor]);
  }

  if (attrs.bold) {
    parts.push(ANSI_SGR_BOLD);
  }

  if (attrs.invert) {
    parts.push(ANSI_SGR_INVERT);
  }

  return CSI + parts.join(";") + "m";
}

// =====================================================================
// Terminal capabilities
// =====================================================================
type TermCap = {
  [color: ANSI3BitColorName]: (text: string) => string;

  green(text: string): string;
  red(text: string): string;
  yellow(text: string): string;
};

class NoTermCap implements TermCap {
  [color: ANSI3BitColorName]: (text: string) => string;
  green = id;
  red = id;
  yellow = id;
}

class ANSITermCap implements TermCap {
  [color: ANSI3BitColorName]: (text: string) => string;
  red(s: string): string {
    return sgr({ bold: true, fgcolor: "red" }) + s + sgr({ reset: true });
  }

  yellow(s: string): string {
    return sgr({ bold: true, fgcolor: "yellow" }) + s + sgr({ reset: true });
  }

  green(s: string): string {
    return sgr({ bold: true, fgcolor: "green" }) + s + sgr({ reset: true });
  }

  gray(s: string): string {
    return sgr({ bold: true, fgcolor: "gray" }) + s + sgr({ reset: true });
  }
}

// =====================================================================
// Log levels
// =====================================================================
function logLevel() {
  const level = process.env["LOG_LEVEL"] ?? "2";
  switch (level) {
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return Number.parseInt(level);

    default:
      throw new ValueError(`LOG_LEVEL must be set to 1-6 (was ${level})`);
  }
}
let LOG_LEVEL = logLevel();

type Severity = readonly [
  name: string,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  color: ANSI3BitColorName
];

const severity = {
  error: ["Error", 1, "red"],
  warn: ["Warn", 2, "yellow"],
  info: ["Info", 4, "green"],
  trace: ["Trace", 5, "green"],
  debug: ["Debug", 6, "yellow"], // XXX Choose a proper color for debug informations
} as const;

type SeverityLevel = keyof typeof severity;

export function setLogLevel(severityLevel: SeverityLevel) {
  const savedLevel = LOG_LEVEL;
  LOG_LEVEL = severity[severityLevel][1];

  return () => {
    LOG_LEVEL = savedLevel;
  };
}

interface DebugConsole {
  log(
    severity: Severity,
    module: string,
    errorCode: ErrorCode,
    message: string,
    ...rest: any[]
  ): void;
}

class DefaultDebugConsole implements DebugConsole {
  readonly termcap: TermCap;

  constructor(termcap?: TermCap) {
    if (!termcap) {
      termcap = process.stderr.isTTY ? new ANSITermCap() : new NoTermCap();
    }

    this.termcap = termcap;
  }

  log(
    severity: Severity,
    module: string,
    errorCode: ErrorCode,
    message: string,
    ...rest: any[]
  ) {
    const [type, level, color] = severity;
    if (LOG_LEVEL >= level) {
      let header = `${type[0]}:${errorCode}:${module}:`;
      const colorFn = this.termcap[color];
      if (colorFn) {
        header = colorFn(header);
      }
      console.error(`${header} ${message}`, ...rest);
    }
  }
}

export const defaulDebugConsole = new DefaultDebugConsole();

function errorMessage(errorCode: ErrorCode, message: string | undefined) {
  return message ?? ERRORS[errorCode] ?? "💣 Missing error message";
}

class DebugFacade {
  constructor(
    public readonly console: DebugConsole,
    public readonly module: string
  ) {}

  public error(errorCode: ErrorCode, message?: string, ...rest: any[]): void {
    this.console.log(
      severity.error,
      this.module,
      errorCode,
      errorMessage(errorCode, message),
      ...rest
    );
  }

  public warn(errorCode: ErrorCode, message?: string, ...rest: any[]): void {
    this.console.log(
      severity.warn,
      this.module,
      errorCode,
      errorMessage(errorCode, message),
      ...rest
    );
  }

  public info(errorCode: ErrorCode, message?: string, ...rest: any[]): void {
    this.console.log(
      severity.info,
      this.module,
      errorCode,
      errorMessage(errorCode, message),
      ...rest
    );
  }

  public trace(errorCode: ErrorCode, message?: string, ...rest: any[]) {
    this.console.log(
      severity.trace,
      this.module,
      errorCode,
      errorMessage(errorCode, message),
      ...rest
    );
  }

  /**
   * Debug messages are temporary and often modified during development, so they don't have associated error codes.
   * When debug messages trace errors or exceptional conditions that should remain in the code,
   * they *must* be preceded by a message of another log level (trace to error) with proper error code attribution.
   */
  public debug(...rest: any[]) {
    this.console.log(
      severity.debug,
      this.module,
      "C9999",
      "DEBUGGING INFORMATION\n",
      ...rest
    );
  }
}

export function logger(module: string) {
  return new DebugFacade(defaulDebugConsole, module);
}

export class ObjectAlreadyRegisteredError extends Error {
  readonly obj: object;
  readonly id: string;

  constructor(obj: object, id: string) {
    // Synthesize an error message
    const message = `Object ${obj} is already registered with ID "${id}".`;
    super(message);

    this.name = "ObjectAlreadyRegisteredError";
    this.obj = obj;
    this.id = id;

    // Ensure the prototype chain is properly set for extending Error
    Object.setPrototypeOf(this, ObjectAlreadyRegisteredError.prototype);
  }
}
