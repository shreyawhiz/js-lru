/**
 * A doubly linked list-based Least Recently Used (LRU) cache. Will keep most
 * recently used items while discarding least recently used items when its limit
 * is reached.
 *
 * Licensed under MIT. Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 * See README.md for details.
 *
 * Illustration of the design:
 *
 *       entry             entry             entry             entry
 *       ______            ______            ______            ______
 *      | head |.newer => |      |.newer => |      |.newer => | tail |
 *      |  A   |          |  B   |          |  C   |          |  D   |
 *      |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */
function LRUCache (limit) {
  // Current size of the cache. (Read-only).
  this.size = 0;
  // Maximum number of items this cache can hold.
  this.limit = limit;
}

/**
 * Put <value> into the cache associated with <key>. Returns the entry which was
 * removed to make room for the new entry. Otherwise undefined is returned
 * (i.e. if there was enough room already).
 */
LRUCache.prototype.put = function(key, value) {
  var entry = {key:key, value:value};
  if (this.tail) {
    // link previous tail to the new tail (entry)
    this.tail.newer = entry;
    entry.older = this.tail;
  } else {
    // we're first in -- yay
    this.head = entry;
  }
  // add new entry to the end of the linked list -- it's now the freshest entry.
  this.tail = entry;
  if (this.size === this.limit) {
    // we hit the limit -- remove the head
    return this.unshift();
  } else {
    // increase the size counter
    this.size++;
  }
}

/**
 * Purge the least recently used (oldest) entry from the cache. Returns the
 * removed entry or undefined if the cache was empty.
 *
 * If you need to perform any form of finalization of purged items, this is a
 * good place to do it. Simply override/replace this function:
 *
 *   var c = new LRUCache(123);
 *   c.unshift = function() {
 *     var entry = LRUCache.prototype.unshift.call(this);
 *     doSomethingWith(entry);
 *     return entry;
 *   }
 */
LRUCache.prototype.unshift = function() {
  // todo: handle special case when limit == 1
  var entry = this.head;
  this.head = this.head.newer;
  // Remove last strong reference to <entry> and remove links from the purged
  // entry being returned:
  delete this.head.older, entry.newer, entry.older;
  return entry;
}

/**
 * Get and register recent use of <key>. Returns the value associated with <key>
 * or undefined if not in cache.
 */
LRUCache.prototype.get = function(key) {
  // First, find our cache entry
  var entry = this.find(key);
  if (entry === undefined) return; // Not cached. Sorry.
  // As <key> was found in the cache, register it as being requested recently
  if (entry === this.tail) {
    // Already the most recenlty used entry, so no need to update the list
    return entry.value;
  }
  // HEAD--------------TAIL
  //   <.older   .newer>
  //  <--- add direction --
  //   A  B  C  <D>  E
  if (entry.newer) {
    if (entry === this.head)
      this.head = entry.newer;
    entry.newer.older = entry.older; // C <-- E.
  }
  if (entry.older)
    entry.older.newer = entry.newer; // C. --> E
  delete entry.newer; // D --x
  entry.older = this.tail; // D. --> E
  if (this.tail)
    this.tail.newer = entry; // E. <-- D
  this.tail = entry;
  return entry.value;
}

/**
 * Check if <key> is in the cache without registering recent use. Feasible if
 * you do not want to chage the state of the cache, but only "peek" at it.
 * Returns the entry associated with <key> if found, otherwise undefined is
 * returned.
 */
LRUCache.prototype.find = function(key) {
  // Start by looking at the most recently used item, and move on with older 
  // items. For the general use case of an LRU, there are more hits on recently 
  // used items than on less recently used ones.
  var entry = this.tail;
  while (entry) {
    if (entry.key === key) return entry;
    entry = entry.older;
  }
}

/**
 * Remove entry <key> from cache and return its value. Returns undefined if not
 * found.
 */
LRUCache.prototype.remove = function(key) {
  var entry = this.find(key);
  if (!entry) return;
  if (entry.newer && entry.older) {
    // relink the older entry with the newer entry
    entry.older.newer = entry.newer;
    entry.newer.older = entry.older;
  } else if (entry.newer) {
    // remove the link to us
    delete entry.newer.older;
    // link the newer entry to head
    this.head = entry.newer;
  } else if (entry.older) {
    // remove the link to us
    delete entry.older.newer;
    // link the newer entry to head
    this.tail = entry.older;
  }
  return entry.value;
}

/** Removes all entries */
LRUCache.prototype.removeAll = function() {
  // This should be safe, as we never expose strong refrences to the outside
  delete this.head, this.tail;
  this.size = 0;
}

/** Returns a JSON (array) representation */
LRUCache.prototype.toJSON = function() {
  var s = [], entry = this.head;
  while (entry) {
    s.push({key:entry.key.toJSON(), value:entry.value.toJSON()});
    entry = entry.newer;
  }
  return s;
}
/** Returns a String representation */
LRUCache.prototype.toString = function() {
  var s = '', entry = this.head;
  while (entry) {
    s += String(entry.key)+':'+entry.value;
    if (entry = entry.newer)
      s += ' < ';
  }
  return s;
}

var sys = require('sys'), assert = require('assert');
var c = new LRUCache(4);

c.put('adam', 29);
c.put('john', 26);
c.put('angela', 24);
c.put('bob', 48);
assert.equal(c.toString(), 'adam:29 < john:26 < angela:24 < bob:48');

assert.equal(c.get('adam'), 29);
assert.equal(c.get('john'), 26);
assert.equal(c.get('angela'), 24);
assert.equal(c.get('bob'), 48);
assert.equal(c.toString(), 'adam:29 < john:26 < angela:24 < bob:48');

assert.equal(c.get('angela'), 24);
assert.equal(c.toString(), 'adam:29 < john:26 < bob:48 < angela:24');

c.put('ygwie', 81);
assert.equal(c.toString(), 'john:26 < bob:48 < angela:24 < ygwie:81');
assert.equal(c.get('adam'), undefined);

c.put('john', 11);
assert.equal(c.toString(), 'bob:48 < angela:24 < ygwie:81 < john:11');
assert.equal(c.get('john'), 11);
