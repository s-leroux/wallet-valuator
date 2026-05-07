import { Fixed, IntegerSource } from "./bignumber.mjs";
import { ValueError } from "./error.mjs";
import { Ensure } from "./type.mjs";

/**
 * Special remarks regarding this module compared to standard Intl formatting:
 *
 * For this project, the primary use case is importing "exotic" CSV data, not
 * consuming trusted locale metadata. In that context, client code usually knows
 * concrete parsing parameters (decimal separator, grouping usage, group separator)
 * even when no standard locale can be reliably identified.
 *
 * Therefore, the rest of the library (for example {@link Fixed.fromString}) keeps
 * canonical parsing from POSIX-like decimal strings. This module focuses on normalizing
 * human-facing numeric text into canonical decimal form.
 *
 * Locale discovery via `Intl.NumberFormat(...)` might be useful, but it is neither
 * required nor implemented yet.
 */

//======================================================================
//  Number parsing
//======================================================================

export type IntlNumberOptionBag = {
  "decimal-separator"?: string; // The 1-char decimal separator. Default is ".".
  "grouping-separator"?: string; // The 1-char grouping separator. Undefined if no grouping separator is allowed.
};

const SPACE_GROUP_SYMBOLS = new Set([" ", "\u00A0", "\u202F", "\u2009"]); // Unicode whitespace characters that are considered grouping separators.

export const enum NumberParsingState {
  Start,
  Sign,
  InitialDigit0,
  InitialDigit1,
  InitialDigit2,
  InitialDigit3,
  GroupDigit0,
  GroupDigit1,
  GroupDigit2,
  GroupDigit3,
  DecimalSeparator,
  DecimalDigit,
  End,
  Error,
}

const enum NumberParsingToken {
  Digit,
  Sign,
  GroupingSeparator,
  DecimalSeparator,
  EOF,
  Unexpected,
}

/**
 * Converts a localized numeric input string to the canonical decimal format expected by Fixed.fromString.
 *
 * The output always uses:
 * - "." as decimal separator,
 * - optional leading "+" / "-",
 * - ASCII digits.
 */
export function intlToCanonicalNumber(
  input: string,
  options: IntlNumberOptionBag = {},
): string {
  const decimalSeparator = options["decimal-separator"] ?? ".";
  const groupingSeparator = options["grouping-separator"] ?? undefined;

  // Parameter validation
  Ensure.isOneCharString(decimalSeparator);
  if (groupingSeparator !== undefined) {
    Ensure.isOneCharString(groupingSeparator);
    if (groupingSeparator === decimalSeparator) {
      throw new ValueError(
        `Grouping separator and decimal separator cannot be the same: ${groupingSeparator}`,
      );
    }
  }

  // State machine implementation
  let output = "";
  let error: Error;

  let state: NumberParsingState = NumberParsingState.Start;
  let token!: NumberParsingToken; // The state machine ensures token is initialized
  let idx = 0;
  let ch: string = "";

  function readNextToken(): void {
    ch = input[idx++] ?? "\0";

    switch (ch) {
      case "\0":
        token = NumberParsingToken.EOF;
        break;
      case "+":
      case "-":
        token = NumberParsingToken.Sign;
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        token = NumberParsingToken.Digit;
        break;
      case decimalSeparator:
        token = NumberParsingToken.DecimalSeparator;
        break;
      case groupingSeparator:
        token = NumberParsingToken.GroupingSeparator;
        break;
      default:
        token = NumberParsingToken.Unexpected;
        break;
    }
  }

  readNextToken();
  stateMachine: for (;;) {
    // See @src/intl.dot for the state machine diagram.
    switch (state) {
      case NumberParsingState.Start:
        switch (token) {
          case NumberParsingToken.Digit:
            output += ch;
            readNextToken();
            state = NumberParsingState.InitialDigit0;
            continue stateMachine;
          case NumberParsingToken.Sign:
            output += ch;
            readNextToken();
            state = NumberParsingState.Sign;
            continue stateMachine;
          default:
            error = new ValueError(`Unexpected token: ${token}`);
            state = NumberParsingState.Error;
            continue stateMachine;
        }

      case NumberParsingState.End:
        return output;

      case NumberParsingState.Error:
        throw error!; // The state machine ensures error is initialized

      case NumberParsingState.Sign:
        switch (token) {
          case NumberParsingToken.Digit:
            output += ch;
            readNextToken();
            state = NumberParsingState.InitialDigit0;
            continue stateMachine;
          default:
            error = new ValueError(`Unexpected token: ${token}`);
            state = NumberParsingState.Error;
            continue stateMachine;
        }

      case NumberParsingState.InitialDigit0:
      case NumberParsingState.InitialDigit1:
      case NumberParsingState.InitialDigit2:
        switch (token) {
          case NumberParsingToken.Digit:
            output += ch;
            readNextToken();
            ++state; // All InitialDigit[0-2] states have the same transition
            continue stateMachine;
          case NumberParsingToken.GroupingSeparator:
            readNextToken();
            state = NumberParsingState.GroupDigit0;
            continue stateMachine;
          case NumberParsingToken.DecimalSeparator:
            readNextToken();
            state = NumberParsingState.DecimalSeparator;
            continue stateMachine;
          case NumberParsingToken.EOF:
            state = NumberParsingState.End;
            continue stateMachine;
          default:
            error = new ValueError(`Unexpected token: ${token}`);
            state = NumberParsingState.Error;
            continue stateMachine;
        }

      case NumberParsingState.InitialDigit3:
        if (groupingSeparator === undefined) {
          state = NumberParsingState.InitialDigit0;
          continue stateMachine;
        }
        switch (token) {
          case NumberParsingToken.GroupingSeparator:
            readNextToken();
            state = NumberParsingState.GroupDigit0;
            continue stateMachine;
          case NumberParsingToken.DecimalSeparator:
            readNextToken();
            state = NumberParsingState.DecimalSeparator;
            continue stateMachine;
          case NumberParsingToken.EOF:
            state = NumberParsingState.End;
            continue stateMachine;
          default:
            error = new ValueError(
              `Unexpected token: ${token}. Expected grouping separator, decimal separator, or EOF.`,
            );
            state = NumberParsingState.Error;
            continue stateMachine;
        }

      case NumberParsingState.GroupDigit0:
      case NumberParsingState.GroupDigit1:
      case NumberParsingState.GroupDigit2:
        switch (token) {
          case NumberParsingToken.Digit:
            output += ch;
            readNextToken();
            ++state; // All GroupDigit[0-2] states have the same transition
            continue stateMachine;
          default:
            error = new ValueError(
              `Unexpected token: ${token}. Expected digit.`,
            );
            state = NumberParsingState.Error;
            continue stateMachine;
        }

      case NumberParsingState.GroupDigit3:
        switch (token) {
          case NumberParsingToken.GroupingSeparator:
            readNextToken();
            state = NumberParsingState.GroupDigit0;
            continue stateMachine;
          case NumberParsingToken.DecimalSeparator:
            readNextToken();
            state = NumberParsingState.DecimalSeparator;
            continue stateMachine;
          case NumberParsingToken.EOF:
            state = NumberParsingState.End;
            continue stateMachine;
          default:
            error = new ValueError(
              `Unexpected token: ${token}. Expected grouping separator, decimal separator, or EOF.`,
            );
            state = NumberParsingState.Error;
            continue stateMachine;
        }

      case NumberParsingState.DecimalSeparator:
        output += ".";
        state = NumberParsingState.DecimalDigit;
        continue stateMachine;

      case NumberParsingState.DecimalDigit:
        switch (token) {
          case NumberParsingToken.Digit:
            output += ch;
            readNextToken();
            continue stateMachine;
          case NumberParsingToken.EOF:
            state = NumberParsingState.End;
            continue stateMachine;
          default:
            error = new ValueError(
              `Unexpected token: ${token}. Expected digit or EOF.`,
            );
            state = NumberParsingState.Error;
            continue stateMachine;
        }
    }
  }
}

export function intlNumberWrapper<R>(
  fn: (canonical: string) => R,
  options: IntlNumberOptionBag = {},
): (input: string) => R {
  return (input: string) => {
    const canonical = intlToCanonicalNumber(input, options);
    return fn(canonical);
  };
}

/**
 * Parses a localized numeric string and returns a Fixed.
 *
 * This is a convenience adapter over intlToCanonicalNumber + Fixed.fromString.
 */
export function fixedFromIntl(
  input: string,
  options: IntlNumberOptionBag = {},
  targetScale?: IntegerSource,
): Fixed {
  const canonical = intlToCanonicalNumber(input, options);
  return Fixed.fromString(canonical, targetScale);
}
