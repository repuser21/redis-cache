// Yallist is a (good) doubly linked list implementation in JavaScript:
// https://github.com/isaacs/yallist
// We alias some method names for clarity; you can assume no bugs here.
const Yallist = require('yallist');
const DefaultScheduler = require('./defaultScheduler');
Yallist.prototype.addToFront = Yallist.prototype.unshift;
Yallist.prototype.addToBack = Yallist.prototype.push;
Yallist.prototype.moveToFront = Yallist.prototype.unshiftNode;
Yallist.prototype.moveToBack = Yallist.prototype.pushNode;

module.exports = class MemoryCache {
  // Private props:

  // The maximum number of items this cache should have at any given time.
  // A value of 0 means unbounded.
  // When adding a new item would put this cache over capacity,
  // the least recently accessed item(s) will be purged to make room.
  _maxItems = 0;

  // To purge the least recently accessed item(s) when over capacity,
  // we implement a standard LRU cache using a doubly linked list + map.
  //
  // The doubly linked list, sorted by most recently read items first,
  // allows us to both query the least recently read items quickly *and*
  // move or add items (on read & write respectively) to the front quickly,
  // while the map allows us to look items up by key quickly.

  _mostRecentlyRead = new Yallist(); // elements are {key, value} objects
  _nodesByKey = new Map(); // values are Yallist Nodes
  _scheduler = new DefaultScheduler();

  // Public API:

  constructor(opts = {}) {
    if (typeof opts.maxItems === 'number') {
      this._maxItems = opts.maxItems;
    }
  }

  /**
   * Queries this cache for the value under the given key,
   * and (async'ly) returns `{cached: boolean, value: any}`.
   * If found (& unexpired), `cached` is true, even if `value` is null.
   * If not found (or expired), `cached` is false, and `value` is null.
   *
   * @param {string} key
   */
  async get(key) {
    // Do we have this key in our cache?
    if (!this._nodesByKey.has(key)) {
      return { cached: false, value: null };
    }

    const node = this._nodesByKey.get(key);
    const item = node.value;

    // TODO: Check for expiry, and clear if expired.

    // Mark as most recently read.
    this._mostRecentlyRead.moveToFront(node);

    return { cached: true, value: item.value };
  }

  /**
   * Caches the given value (which may be null) under the given key,
   * optionally expiring after the given number of milliseconds.
   *
   * @param {string} key
   * @param {any} value
   * @param {object} opts Options of the form `{expireAfterMS}`.
   */
  async set(key, value, opts = {}) {
    // Add item.
    // TODO: Store expiry too, and clear when expired.
    const item = { key, value };

    // If we're over capacity, evict least recently read items.
    while (this._maxItems > 0 && this._nodesByKey.size >= this._maxItems) {
      const oldestItem = this._mostRecentlyRead.tail.value;
      await this.clear(oldestItem.key);
    }

    this._mostRecentlyRead.addToFront(item);
    this._nodesByKey.set(key, this._mostRecentlyRead.head);
  }

  /**
   * Clears the value, if any, cached under the given key.
   * Async'ly returns whether a value was cached (and thus cleared).
   *
   * @param {string} key
   */
  async clear(key) {
    // Do we have this key in our cache? Noop if not.
    if (!this._nodesByKey.has(key)) {
      return false;
    }

    // Clear item if so.
    const node = this._nodesByKey.get(key);
    this._mostRecentlyRead.removeNode(node);
    this._nodesByKey.delete(key);

    return true;
  }
};
