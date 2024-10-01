import { assert } from 'chai';
import * as main from '../src/main.mjs';

describe("Suite", () => {
  it("works", () => {
    assert.equal("Hello", main.greetings());
  });
});
