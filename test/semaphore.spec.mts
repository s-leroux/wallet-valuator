// semaphore.spec.ts
import { assert } from "chai";
import { Semaphore } from "../src/semaphore.mjs"; // adjust this path accordingly
import { ProtocolError, ValueError } from "../src/error.mjs";

describe("Semaphore", function () {
  this.timeout(10);

  it("should throw ValueError if constructed with n < 1", () => {
    assert.throws(
      () => new Semaphore(0),
      ValueError,
      "Concurrency level should be >= 1"
    );
    assert.throws(
      () => new Semaphore(-5),
      ValueError,
      "Concurrency level should be >= 1"
    );
  });

  it("should resolve immediately if semaphore is not full", async () => {
    const sem = new Semaphore(2);
    // Two consecutive get() calls should resolve immediately since capacity is 2.
    await sem.get();
    await sem.get();
  });

  it("should queue when semaphore is full and resolve after release", async function () {
    this.timeout(20);

    const sem = new Semaphore(1);
    let resolved = false;

    // Acquire one slot so that semaphore is full.
    await sem.get();

    // This call should be queued.
    const p = sem.get().then(() => {
      resolved = true;
    });

    // Give a moment for the promise to (not) resolve.
    await new Promise((r) => setTimeout(r, 10));
    assert.isFalse(
      resolved,
      "Promise should not be resolved while semaphore is full"
    );

    // Release the slot; queued promise should now resolve.
    sem.release();
    await p;
    assert.isTrue(resolved, "Promise should resolve after release");
  });

  it("should correctly decrease running count on release", async () => {
    const sem = new Semaphore(2);
    // Acquire two slots.
    await sem.get();
    await sem.get();
    // Release one slot.
    sem.release();
    // Now we should be able to acquire another slot immediately.
    await sem.get();
  });

  it("should throw ProtocolError if release is called more times than get", () => {
    const sem = new Semaphore(1);
    assert.throws(
      () => sem.release(),
      ProtocolError,
      "release() called more times than get()"
    );
  });

  it("should handle multiple queued tasks in FIFO order", async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];

    // Fill the semaphore.
    await sem.get();

    // Queue two get() calls.
    const p1 = sem.get().then(() => order.push(1));
    const p2 = sem.get().then(() => order.push(2));

    // Release one slot; p1 should resolve.
    sem.release();
    await p1;
    assert.deepEqual(order, [1], "p1 should resolve first");

    // Release another slot; p2 should resolve.
    sem.release();
    await p2;
    assert.deepEqual(order, [1, 2], "p2 should resolve second");
  });
});
