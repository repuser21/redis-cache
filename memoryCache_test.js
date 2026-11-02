const assert = require('assert').strict;
const MemoryCache = require('./memoryCache');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

suite('MemoryCache', function () {
  // Helpers:

  async function assertNotInCache(cache, key) {
    const { cached, value } = await cache.get(key);
    assert.equal(
      cached,
      false,
      `Expected '${key}' to not be in cache, but was`
    );
    assert.equal(value, null);
  }

  async function assertCachedEquals(cache, key, expected) {
    const { cached, value } = await cache.get(key);
    assert.equal(cached, true, `Expected '${key}' to be in cache, but wasn't`);
    assert.equal(value, expected);
  }

  // Tests:

  test('Basic', async function () {
    // Without worrying about capacity or expiry,
    // we should be able to get, set, and clear.

    const cache = new MemoryCache();

    // Initially, the cache should contain nothing.

    await assertNotInCache(cache, 'a');
    await assertNotInCache(cache, 'b');
    await assertNotInCache(cache, 'c');

    // We should be able to add items to the cache, then retrieve them.

    const a = 'A';
    const b = 'B';

    await cache.set('a', a);
    await cache.set('b', b);


    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'b', b);

    // Should be able to keep reading the items; they shouldn't be evicted.

    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'b', b);

    // We should be able to clear items from the cache too.
    // Other items should remain in the cache.

    assert.equal(await cache.clear('a'), true);
    assert.equal(await cache.clear('a'), false); // already cleared

    await assertNotInCache(cache, 'a');
    await assertCachedEquals(cache, 'b', b);
  });

  test('Capacity', async function () {
    // We should be able to limit the cache to a fixed memory capacity.
    // Adding items to the cache beyond the capacity should purge the
    // least recently read items.

    const cache = new MemoryCache({ maxItems: 3 });

    // Add items up to the capacity. All items should be retained.

    const a = 'A';
    const b = 'B';
    const c = 'C';

    await cache.set('a', a);
    await cache.set('b', b);
    await cache.set('c', c);

    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'b', b);
    await assertCachedEquals(cache, 'c', c);

    // Access the items in some different order.

    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'b', b);
    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'b', b); // b is least recently read
    await assertCachedEquals(cache, 'c', c);
    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'c', c); // c is most recently read

    // Add one more item to the cache. The least recently read item should be gone.

    const d = 'D';

    await cache.set('d', d);

    console.log(cache._nodesByKey)

    await assertNotInCache(cache, 'b');

    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'c', c);
    await assertCachedEquals(cache, 'd', d);

    // Access the current items in some different order again.

    await assertCachedEquals(cache, 'c', c); // c is least recently read
    await assertCachedEquals(cache, 'd', d);
    await assertCachedEquals(cache, 'a', a); // a is most recently read

    // Add *two* items to the cache. The *two* least recently read items should be gone.

    const e = 'E';

    await cache.set('b', b); // b again
    await cache.set('e', e);

    await assertNotInCache(cache, 'c');

    await assertNotInCache(cache, 'd');

    await assertCachedEquals(cache, 'a', a);
    await assertCachedEquals(cache, 'b', b);
    await assertCachedEquals(cache, 'e', e);
  });

  test('Expiry', async function () {
    // Items set with `expireAfterMS` should be retrievable until they expire,
    // then behave as if they were never cached. Items without it never expire.
    // this.timeout(5000);

    // const SHORT = 100; // ms
    // const LONG = 400; // ms

    // // A scheduler that never fires. Caches using it must rely on get()/clear()
    // // checking expiry themselves (real timers can fire late).
    // const neverFires = { runOnceAfter: () => () => {} };

    // // --- t = 0: set everything up ---

    // // Main cache: mix of expiring and non-expiring items, at capacity.
    // const cache = new MemoryCache({ maxItems: 4 });
    // await cache.set('a', 'A'); // never expires
    // await cache.set('b', 'B', { expireAfterMS: SHORT });
    // await cache.set('c', 'C', { expireAfterMS: LONG });
    // await cache.set('d', 'D', { expireAfterMS: SHORT });

    // // Before any expiry, everything should be cached.
    // await assertCachedEquals(cache, 'a', 'A');
    // await assertCachedEquals(cache, 'b', 'B');
    // await assertCachedEquals(cache, 'c', 'C');
    // await assertCachedEquals(cache, 'd', 'D');

    // // Overwrite d with no expiry. Its old expiry (and timer) must no longer apply.
    // await cache.set('d', 'D2');

    // // Overwrites, clears and evictions on other caches. Old timers
    // // must never remove a newer value under the same key.
    // const other = new MemoryCache();
    // await other.set('w', 'W1', { expireAfterMS: LONG });
    // await other.set('w', 'W2', { expireAfterMS: SHORT }); // shorter expiry replaces longer
    // await other.set('k', 'K1', { expireAfterMS: SHORT });
    // assert.equal(await other.clear('k'), true);
    // await other.set('k', 'K2'); // re-set after clear, no expiry
    // await other.set('n', null, { expireAfterMS: SHORT }); // null value with expiry
    // await assertCachedEquals(other, 'n', null);

    // const tiny = new MemoryCache({ maxItems: 1 });
    // await tiny.set('x', 'X1', { expireAfterMS: SHORT });
    // await tiny.set('y', 'Y'); // evicts x
    // await assertNotInCache(tiny, 'x');
    // await tiny.set('x', 'X2'); // evicts y, re-adds x with no expiry

    // // Caches whose timers never fire.
    // const lazy = new MemoryCache({ maxItems: 2 });
    // lazy._scheduler = neverFires;
    // await lazy.set('p', 'P', { expireAfterMS: SHORT });
    // await lazy.set('q', 'Q');
    // await assertCachedEquals(lazy, 'p', 'P'); // p most recently read, q least

    // const lazyClear = new MemoryCache();
    // lazyClear._scheduler = neverFires;
    // await lazyClear.set('s', 'S', { expireAfterMS: SHORT });

    // // --- t = 30..90ms: reading an item must not extend its expiry ---
    // for (let i = 0; i < 3; i++) {
    //   await sleep(30);
    //   await assertCachedEquals(cache, 'b', 'B');
    // }
    // // Main cache order is now (most -> least recently read): b, d, c, a.

    // // --- t ~ 150ms: SHORT items have expired ---
    // await sleep(60);

    // // Expired items shouldn't take up capacity: b's slot is free, so adding e
    // // must not evict a (the least recently read live item).
    // await cache.set('e', 'E');
    // await assertNotInCache(cache, 'b');
    // await assertCachedEquals(cache, 'a', 'A');
    // await assertCachedEquals(cache, 'c', 'C');
    // await assertCachedEquals(cache, 'd', 'D2');
    // await assertCachedEquals(cache, 'e', 'E');

    // // Clearing an expired item is a noop.
    // assert.equal(await cache.clear('b'), false);

    // // Overwritten / cleared / evicted keys keep their newest value and expiry.
    // await assertNotInCache(other, 'w'); // W2's shorter expiry applied
    // await assertCachedEquals(other, 'k', 'K2');
    // await assertNotInCache(other, 'n');
    // await assertCachedEquals(tiny, 'x', 'X2');

    // // get() must detect expiry itself, even if the timer hasn't fired...
    // await assertNotInCache(lazy, 'p');
    // await assertNotInCache(lazy, 'p');
    // // ...and actually remove the item, not just hide it: adding r should
    // // keep q rather than evict it to make room for the expired p.
    // await lazy.set('r', 'R');
    // await assertCachedEquals(lazy, 'q', 'Q');
    // await assertCachedEquals(lazy, 'r', 'R');

    // // clear() must also treat an expired (not yet removed) item as not cached.
    // assert.equal(await lazyClear.clear('s'), false);
    // await assertNotInCache(lazyClear, 's');

    // // Setting a key again after it expired works normally. The cache is full
    // // (a, c, d, e), so this evicts a, the least recently read.
    // await cache.set('b', 'B2');
    // await assertCachedEquals(cache, 'b', 'B2');
    // await assertNotInCache(cache, 'a');

    // // --- t ~ 450ms: LONG items have expired; items without expiry remain ---
    // await sleep(300);
    // await assertNotInCache(cache, 'c');
    // await assertCachedEquals(cache, 'b', 'B2');
    // await assertCachedEquals(cache, 'd', 'D2');
    // await assertCachedEquals(cache, 'e', 'E');
  });
});
