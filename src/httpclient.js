'use strict';

var http = require('http'),
    https = require('https'),
    querystring = require('querystring'),
    underscore = require('underscore');

/**
 * @param {object}  Options:
 *                      https (false)   - Set to true for HTTPS calls
 *                      auth ('username:password')
 *                      host ('localhost')
 *                      port (80 for http, 443 for https)
 *                      path ('')       - Base path URL e.g. '/api'
 *                      headers ({})    - Default headers for all requests
 *                      status (null)   - Expected status code for all responses
 *                      timeout (0)     - Request timeout in milliseconds (0 = no timeout)
 * @param options
 */
var HttpClient = module.exports = function(options) {
    options = options || {};

    this.https = options.https || false;
    this.auth = options.auth || undefined;
    this.host = options.host || 'localhost';
    this.port = options.port || (this.https ? 443 : 80);
    this.path = options.path || '';
    this.headers = options.headers || {};
    this.status = options.status;
    this.timeout = options.timeout || 0;
};

HttpClient.create = function(options) {
    return new HttpClient(options);
};

var methods = ['get', 'post', 'head', 'put', 'del', 'trace', 'options', 'connect', 'patch'];

/**
 * Performs HTTP/HTTPS request
 *
 * @param {object|null} assert - Assert object for testing (can be null)
 * @param {string} path - Request path
 * @param {object} req - Request options (headers, data, auth, etc.)
 * @param {object} res - Expected response options (status, headers, body, etc.)
 * @param {Function} cb - Callback function
 */
methods.forEach(function(method) {
    HttpClient.prototype[method] = function(assert, path, req, res, cb) {
        var self = this;

        // Initialize default values
        req = req || {};
        res = res || {};

        // Handle different signatures
        if (arguments.length === 2) {
            // (assert, path) or (null, path)
            cb = null;
        } else if (arguments.length === 3) {
            if (typeof req === 'function') {
                // (assert, path, cb)
                cb = req;
                req = {};
                res = {};
            } else {
                // (assert, path, res)
                cb = null;
                res = req;
                req = {};
            }
        } else if (arguments.length === 4) {
            if (typeof res === 'function') {
                // (assert, path, req, cb)
                cb = res;
                res = {};
            }
            // else: (assert, path, req, res)
        }
        // arguments.length === 5: (assert, path, req, res, cb)

        // Generate full path
        var fullPath = this.path + (path || '');

        // Add query parameters for GET-like methods
        if (['post', 'put', 'patch'].indexOf(method) === -1) {
            var queryData = req.query || req.data;
            if (queryData && typeof queryData === 'object') {
                var queryStr = querystring.stringify(queryData);
                if (queryStr) {
                    fullPath += (fullPath.indexOf('?') === -1 ? '?' : '&') + queryStr;
                }
            }
        }

        // Prepare request headers
        var requestHeaders = underscore.extend({}, this.headers, req.headers || {});

        // Clean undefined headers
        Object.keys(requestHeaders).forEach(function(key) {
            if (requestHeaders[key] === undefined || requestHeaders[key] === null) {
                delete requestHeaders[key];
            }
        });

        var options = {
            host: this.host,
            port: this.port,
            path: fullPath,
            method: method === 'del' ? 'DELETE' : method.toUpperCase(),
            headers: requestHeaders,
            rejectUnauthorized: false // Disable SSL verification
        };

        // Set authentication
        if (req.auth) {
            options.auth = req.auth;
        } else if (this.auth) {
            options.auth = this.auth;
        }

        // Set timeout
        if (req.timeout || this.timeout) {
            options.timeout = req.timeout || this.timeout;
        }

        // Choose HTTP or HTTPS module
        var requestModule = this.https ? https : http;
        var request = requestModule.request(options);

        // Set request timeout
        if (options.timeout) {
            request.setTimeout(options.timeout, function() {
                request.abort();
                var error = new Error('Request timeout after ' + options.timeout + 'ms');
                error.code = 'TIMEOUT';
                if (cb) {
                    return cb(error, null);
                }
            });
        }

        // Handle request body for POST/PUT/PATCH
        if (['post', 'put', 'patch'].indexOf(method) !== -1) {
            var bodyData = req.body || req.data;

            if (bodyData) {
                if (typeof bodyData === 'object') {
                    // JSON data
                    var jsonData = JSON.stringify(bodyData);
                    request.write(jsonData);
                } else if (typeof bodyData === 'string') {
                    // String data
                    request.setHeader('Content-Length', Buffer.byteLength(bodyData));
                    request.write(bodyData);
                } else if (Buffer.isBuffer(bodyData)) {
                    // Buffer data
                    request.setHeader('Content-Length', bodyData.length);
                    request.write(bodyData);
                }
            }
        }

        // Handle form data
        if (req.form && typeof req.form === 'object') {
            var formData = querystring.stringify(req.form);
            request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            request.setHeader('Content-Length', Buffer.byteLength(formData));
            request.write(formData);
        }

        // Send request
        request.end();

        // Handle response
        request.on('response', function(response) {
            response.setEncoding('utf8');
            response.body = '';

            response.on('data', function(chunk) {
                response.body += chunk;
            });

            response.on('end', function() {
                // Parse JSON if content-type indicates JSON
                var contentType = response.headers['content-type'] || '';
                if (contentType.indexOf('application/json') !== -1) {
                    try {
                        response.data = JSON.parse(response.body);
                    } catch (e) {
                        response.data = null;
                        response.parseError = e;
                    }
                }

                // Add convenience properties
                response.ok = response.statusCode >= 200 && response.statusCode < 300;
                response.clientError = response.statusCode >= 400 && response.statusCode < 500;
                response.serverError = response.statusCode >= 500;

                // Run response tests if assert is provided
                if (assert) {
                    try {
                        // Test status code
                        var expectedStatus = res.status || self.status;
                        if (expectedStatus) {
                            assert.equal(response.statusCode, expectedStatus,
                                'Expected status ' + expectedStatus + ' but got ' + response.statusCode);
                        }

                        // Test headers
                        var expectedHeaders = underscore.extend({}, self.headers, res.headers || {});
                        Object.keys(expectedHeaders).forEach(function(key) {
                            var expected = expectedHeaders[key];
                            var actual = response.headers[key.toLowerCase()];
                            if (expected !== undefined) {
                                assert.equal(actual, expected,
                                    'Expected header "' + key + '" to be "' + expected + '" but got "' + actual + '"');
                            }
                        });

                        // Test response body
                        if (res.body !== undefined) {
                            assert.equal(response.body, res.body, 'Response body mismatch');
                        }

                        // Test JSON data
                        if (res.data !== undefined) {
                            assert.deepEqual(response.data, res.data, 'Response data mismatch');
                        }

                        // Test response properties
                        if (res.ok !== undefined) {
                            assert.equal(response.ok, res.ok, 'Response ok status mismatch');
                        }

                    } catch (assertError) {
                        if (cb) {
                            return cb(response, assertError);
                        } else if (assert.done) {
                            return assert.done(assertError);
                        }
                        throw assertError;
                    }
                }

                // Call callback or assert.done()
                if (cb) {
                    return cb(response);
                } else if (assert && assert.done) {
                    return assert.done();
                }
            });
        });

        // Handle request errors
        request.on('error', function(error) {
            error.request = {
                method: options.method,
                url: (self.https ? 'https' : 'http') + '://' + self.host + ':' + self.port + fullPath,
                headers: options.headers
            };

            if (cb) {
                return cb(error, null);
            } else if (assert && assert.done) {
                return assert.done(error);
            }

            throw error;
        });
    };
});
