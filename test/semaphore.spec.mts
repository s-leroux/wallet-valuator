// semaphore.spec.ts
import { assert } from "chai";
import { Semaphore } from "../src/semaphore.mjs";
import { Promise } from "../src/promise.mjs";
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
    await Promise.timeout(10);
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

  describe("Semaphore.do()", () => {
    it("should execute the function and return its result (synchronous case)", async () => {
      const sem = new Semaphore(1);
      const result = await sem.do(() => 42);
      assert.strictEqual(result, 42, "Expected function result to be 42");
    });

    it("should execute the function and return its result (asynchronous case)", async function () {
      this.timeout(20);

      const sem = new Semaphore(1);
      const result = await sem.do(async () => {
        // Simulate an async operation with a small delay.
        await Promise.timeout(10);
        return 99;
      });
      assert.strictEqual(result, 99, "Expected async function result to be 99");
    });

    it("should release the slot even if the function throws", async () => {
      const sem = new Semaphore(1);
      let errorCaught = false;
      try {
        await sem.do(() => {
          throw new Error("Test error");
        });
        assert.fail("Expected error was not thrown");
      } catch (err: any) {
        errorCaught = true;
        assert.strictEqual(
          err.message,
          "Test error",
          "Expected error message to match"
        );
      }
      assert.isTrue(errorCaught, "Error should be caught");

      // After throwing, we should still be able to acquire the semaphore.
      const result = await sem.do(() => "recovered");
      assert.strictEqual(
        result,
        "recovered",
        "Semaphore should be released after error"
      );
    });

    it("should enforce semaphore limits with queued tasks", async function () {
      this.timeout(50);

      const sem = new Semaphore(1);
      let running = 0;
      let maxRunning = 0;

      // Define a task that tracks how many tasks run concurrently.
      const task = async (delay: number) => {
        return sem.do(async () => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          await Promise.timeout(delay);
          running--;
          return delay;
        });
      };

      // Start multiple tasks concurrently.
      const results = await Promise.all([task(10), task(10), task(10)]);
      // With a concurrency limit of 1, maxRunning should never exceed 1.
      assert.strictEqual(
        maxRunning,
        1,
        "No more than one task should run concurrently"
      );
      assert.deepEqual(
        results,
        [10, 10, 10],
        "All tasks should complete with their delay values"
      );
    });
  });
});
