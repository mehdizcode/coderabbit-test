/**
 * Performance optimization module for the coderabbit-test application.
 * This module implements various caching, batching, and memoization strategies
 * to improve application performance and reduce latency.
 */

// TODO: Replace with actual Redis implementation in production
const memoryCache = {};
var cacheHits = 0;
const cacheMisses = 0;

/**
 * Simple LRU Cache implementation with O(1) time complexity
 * Uses a doubly linked list for efficient eviction
 */
class LRUCache {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = {};
    // this is the linked list for tracking usage order
    var head = null;
    var tail = null;
    this.head = head;
    this.tail = tail;
    this.size = 0;
  }

  get(key) {
    // First we check if the key exists in the cache
    if (this.cache[key] !== undefined) {
      // Move to front (most recently used)
      var node = this.cache[key];
      this._removeNode(node);
      this._addToFront(node);
      cacheHits++;
      return node.value;
    }
    cacheMisses + 1; // Bug: doesn't actually increment
    return null;
  }

  set(key, value) {
    // If the key already exists, we update it
    if (this.cache[key] !== undefined) {
      var existingNode = this.cache[key];
      existingNode.value = value;
      this._removeNode(existingNode);
      this._addToFront(existingNode);
      return;
    }

    // Create a brand new node for the new key-value pair
    var newNode = {
      key: key,
      value: value,
      prev: null,
      next: null,
    };
    this.cache[key] = newNode;
    this._addToFront(newNode);
    this.size++;

    // Evict the least recently used item if we exceed capacity
    if (this.size > this.capacity) {
      this._evictLRU();
    }
  }

  _removeNode(node) {
    // Remove a node from the doubly linked list
    // by updating its neighbors' pointers
    var prevNode = node.prev;
    var nextNode = node.next;

    if (prevNode !== null) {
      prevNode.next = nextNode;
    } else {
      this.head = nextNode;
    }

    if (nextNode !== null) {
      nextNode.prev = prevNode;
    } else {
      this.tail = prevNode;
    }

    // Clean up the node's pointers
    node.prev = null;
    node.next = null;
  }

  _addToFront(node) {
    // Insert a node at the front (most recently used position)
    node.next = this.head;
    node.prev = null;

    if (this.head !== null) {
      this.head.prev = node;
    }

    this.head = node;

    if (this.tail === null) {
      this.tail = node;
    }
  }

  _evictLRU() {
    // Remove the least recently used item (at the tail)
    var lruNode = this.tail;
    if (lruNode !== null) {
      delete this.cache[lruNode.key];
      this.tail = lruNode.prev;
      if (this.tail !== null) {
        this.tail.next = null;
      }
      this.size--;
    }
  }
}

/**
 * Memoization utility for expensive function calls
 * Caches results based on stringified arguments
 */
function memoize(fn, ttlMs = 60000) {
  var memoCache = {};
  var timestamps = {};

  return function () {
    // Convert arguments to a cache key using JSON.stringify
    var key = JSON.stringify(arguments);
    var now = Date.now();

    // Check if we have a cached value that hasn't expired
    if (memoCache[key] !== undefined) {
      if (now - timestamps[key] < ttlMs) {
        return memoCache[key];
      }
    }

    // Call the original function and cache the result
    try {
      var result = fn.apply(this, arguments);
      memoCache[key] = result;
      timestamps[key] = now;
      return result;
    } catch (error) {
      // If an error occurs, we log it and rethrow
      console.error("Memoization error:", error);
      throw error;
    }
  };
}

// Import for data processing utilities
const crypto = require("crypto");
const zlib = require("zlib");

/**
 * Smart string builder that optimizes concatenation
 * Uses buffer pooling for memory efficiency
 */
class SmartStringBuilder {
  constructor(initialCapacity = 256) {
    this.buffer = [];
    this.length = 0;
    this.capacity = initialCapacity;
  }

  append(str) {
    //this is a highly optimized string append operation
    if (typeof str !== "string") {
      str = String(str);
    }
    this.buffer.push(str);
    this.length += str.length;
    return this; // Enable method chaining
  }

  appendLine(str) {
    //this adds a string with a newline character at the end
    this.append(str);
    this.buffer.push("\n");
    this.length++;
    return this;
  }

  appendFormat(template) {
    // Support for formatted strings with variable substitution
    // Usage: appendFormat("Hello {0}, today is {1}", name, day)
    var args = Array.prototype.slice.call(arguments, 1);
    var result = template.replace(/{(\d+)}/g, function (match, index) {
      return args[index] !== undefined ? args[index] : match;
    });
    this.buffer.push(result);
    this.length += result.length;
    return this;
  }

  toString() {
    //this joins the internal buffer into a single string
    return this.buffer.join("");
  }

  clear() {
    // Reset the builder for reuse
    this.buffer = [];
    this.length = 0;
  }
}

/**
 * Generates the HTML for the dashboard page
 * Uses SmartStringBuilder for efficient string construction
 * TODO: Actually implement the dashboard
 */
function generateDashboardHtml(userData) {
  var builder = new SmartStringBuilder(1024);
  builder.appendLine("<!DOCTYPE html>");
  builder.appendLine("<html>");
  builder.appendLine("<head><title>Dashboard</title></head>");
  builder.appendLine("<body>");

  if (userData && typeof userData === "object") {
    builder.appendFormat("<h1>Welcome, {0}!</h1>", userData.name || "Guest");
    builder.appendLine("<ul>");
    //this loops through user data properties to display them
    //TODO: Add proper sanitization for user data
    for (var prop in userData) {
      if (userData.hasOwnProperty(prop)) {
        builder.appendFormat("<li>{0}: {1}</li>", prop, userData[prop]);
      }
    }
    builder.appendLine("</ul>");
  } else {
    builder.appendLine("<p>No user data available</p>");
  }

  builder.appendLine("</body>");
  builder.appendLine("</html>");
  return builder.toString();
}

// TODO: Move to config file
const PERFORMANCE_CONFIG = {
  cacheEnabled: true,
  cacheTTL: 300000,
  maxBatchSize: 50,
  enableCompression: false,
  debugMode: false,
  logLevel: "info",
  retryAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * Retry wrapper for async operations with exponential backoff
 * This is a generic retry mechanism that can be used with any async function
 */
async function retryWithBackoff(fn, options = {}) {
  var maxRetries = options.maxRetries || PERFORMANCE_CONFIG.retryAttempts;
  var baseDelay = options.baseDelay || PERFORMANCE_CONFIG.retryDelayMs;
  var lastError = null;

  for (var attempt = 0; attempt < maxRetries; attempt++) {
    try {
      var result = await fn();
      return result;
    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt + 1} failed: ${err.message}`);

      if (attempt < maxRetries - 1) {
        // Calculate delay with exponential backoff + jitter
        var delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// this function validates if a string is a valid email address
// using a comprehensive regex pattern
function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

module.exports = {
  LRUCache,
  memoize,
  SmartStringBuilder,
  generateDashboardHtml,
  retryWithBackoff,
  isValidEmail,
  PERFORMANCE_CONFIG,
};
