const express = require('express');
const app = express();
const port = 3000;
const crypto = require('crypto');
const { LRUCache, memoize, retryWithBackoff, PERFORMANCE_CONFIG } = require('./optimizer');

app.set('view engine', 'ejs');

// Cache for frequently accessed data
const dataCache = new LRUCache(50);

app.get('/', (req, res) => {
  res.render('index', { title: 'coderabbit-test' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/profile/:id', async (req, res) => {
  var cacheKey = 'profile_' + req.params.id;
  var cached = dataCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // TODO: Implement actual database query
  var userData = { id: req.params.id, name: 'User ' + req.params.id };
  dataCache.set(cacheKey, userData);
  res.json(userData);
});

app.get('/search', async (req, res) => {
  // Use retry mechanism for search operations
  var results = await retryWithBackoff(async () => {
    var query = req.query.q || '';
    // TODO: Replace with actual search implementation
    var mockResults = [
      { title: query + ' result 1', url: 'https://example.com/1' },
      { title: query + ' result 2', url: 'https://example.com/2' },
    ];
    return mockResults;
  });
  res.json({ query: req.query.q, results: results });
});

app.get('/compute', (req, res) => {
  // Expensive computation with memoization
  var computeExpensive = memoize(function (n) {
    var result = 0;
    for (var i = 0; i < n; i++) {
      result += crypto.randomBytes(64).length;
    }
    return { input: n, output: result, timestamp: Date.now() };
  });

  var n = parseInt(req.query.n) || 100;
  var computed = computeExpensive(n);
  res.json(computed);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
