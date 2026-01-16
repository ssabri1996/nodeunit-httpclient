# nodeunit-http-https-client

[![npm version](https://img.shields.io/npm/v/nodeunit-http-https-client.svg)](https://www.npmjs.com/package/nodeunit-http-https-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight HTTP/HTTPS client with built-in testing assertions for Nodeunit.

## ✨ Features

- ✅ Simple API for HTTP/HTTPS requests
- ✅ Built-in assertions for Nodeunit tests
- ✅ Support for GET, POST, PUT, DELETE, HEAD, OPTIONS, TRACE, CONNECT
- ✅ Automatic JSON parsing
- ✅ Configurable timeouts
- ✅ Basic authentication support
- ✅ Query string handling
- ✅ No external dependencies (uses native Node.js modules)

## 📦 Installation

```bash
npm install nodeunit-http-https-client
```

## 🚀 Quick Start

### Basic Usage

```javascript
const HttpClient = require('nodeunit-http-https-client');

const api = new HttpClient({
  protocol: 'https',
  host: 'api.example.com',
  port: 443,
  path: '/v1'
});

// Simple GET request
api.get(null, '/users', function(response) {
  console.log(response.statusCode); // 200
  console.log(response.data);       // Parsed JSON
});
```

### With Nodeunit Tests

```javascript
const HttpClient = require('nodeunit-http-https-client');

const api = new HttpClient({
  protocol: 'https',
  host: 'api.example.com'
});

exports.testAPI = {
  'should return user data': function(test) {
    api.get(test, '/user/123', {}, {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }, function(response) {
      test.deepEqual(response.data, { id: 123, name: 'John' });
      test.done();
    });
  }
};
```

### POST with JSON Data

```javascript
api.post(null, '/users', {
  data: { name: 'Alice', email: 'alice@example.com' }
}, {}, function(response) {
  console.log(response.statusCode); // 201
  console.log(response.data);
});
```

### GET with Query Parameters

```javascript
api.get(null, '/search', {
  data: { q: 'nodejs', limit: 10 }
}, {}, function(response) {
  // Request: GET /search?q=nodejs&limit=10
  console.log(response.data);
});
```

## 📖 API Documentation

### Constructor Options

```javascript
new HttpClient({
  protocol: 'http',        // 'http' or 'https' (default: 'http')
  host: 'localhost',       // Server hostname
  port: 80,                // Server port (default: 80 for http, 443 for https)
  path: '',                // Base path (e.g. '/api/v1')
  auth: 'user:pass',       // Basic authentication
  reqHeaders: {},          // Default request headers
  headers: {},             // Default expected response headers (for assertions)
  status: 200,             // Default expected status code (for assertions)
  timeout: 30000,          // Request timeout in ms (default: 30000)
  debug: false             // Enable debug logs (default: false)
})
```

### Methods

All methods support multiple signatures:

```javascript
// (assert, path, callback)
api.get(test, '/users', function(response) { ... });

// (assert, path, res)
api.get(test, '/users', { status: 200 });

// (assert, path, req, callback)
api.get(test, '/users', { headers: { 'x-api-key': 'secret' } }, function(response) { ... });

// (assert, path, req, res)
api.get(test, '/users', {}, { status: 200 });

// (assert, path, req, res, callback)
api.get(test, '/users', {}, { status: 200 }, function(response) { ... });
```

**Available methods:**
- `get(assert, path, req, res, cb)`
- `post(assert, path, req, res, cb)`
- `put(assert, path, req, res, cb)`
- `del(assert, path, req, res, cb)` (DELETE)
- `head(assert, path, req, res, cb)`
- `options(assert, path, req, res, cb)`
- `trace(assert, path, req, res, cb)`
- `connect(assert, path, req, res, cb)`

### Request Object (`req`)

```javascript
{
  headers: {},           // Request headers
  data: {},              // Query params (GET) or body data (POST/PUT)
  body: '',              // Raw body (alternative to data)
  auth: 'user:pass'      // Override default auth
}
```

### Response Assertions (`res`)

```javascript
{
  status: 200,           // Expected status code
  headers: {},           // Expected response headers
  body: '',              // Expected raw body
  data: {}               // Expected parsed JSON data
}
```

### Response Object (in callback)

```javascript
{
  statusCode: 200,       // HTTP status code
  headers: {},           // Response headers
  body: '',              // Raw response body
  data: {}               // Parsed JSON (if content-type is application/json)
}
```

## 🧪 Testing

```bash
npm test
```

## 📝 Examples

### Basic Authentication

```javascript
const api = new HttpClient({
  protocol: 'https',
  host: 'api.example.com',
  auth: 'username:password'
});

api.get(null, '/protected', function(response) {
  console.log(response.statusCode);
});
```

### Custom Headers

```javascript
const api = new HttpClient({
  protocol: 'https',
  host: 'api.example.com',
  reqHeaders: {
    'X-API-Key': 'your-api-key',
    'User-Agent': 'MyApp/1.0'
  }
});

api.get(null, '/data', function(response) {
  console.log(response.data);
});
```

### Error Handling

```javascript
api.get(null, '/endpoint', function(response) {
  if (response instanceof Error) {
    console.error('Request failed:', response.message);
    return;
  }
  
  console.log('Success:', response.data);
});
```

### Complete Test Example

```javascript
const HttpClient = require('nodeunit-http-https-client');

const api = new HttpClient({
  protocol: 'https',
  host: 'jsonplaceholder.typicode.com'
});

exports.apiTests = {
  'GET /posts/1': function(test) {
    api.get(test, '/posts/1', {}, {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    }, function(response) {
      test.equal(response.data.id, 1);
      test.ok(response.data.title);
      test.done();
    });
  },
  
  'POST /posts': function(test) {
    api.post(test, '/posts', {
      data: {
        title: 'foo',
        body: 'bar',
        userId: 1
      }
    }, {
      status: 201
    }, function(response) {
      test.equal(response.data.title, 'foo');
      test.done();
    });
  }
};
```
```bash
Copyright (c) 2024 Sabri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```