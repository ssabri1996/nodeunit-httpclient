// test/httpclient.test.js

var serverPort = 3600,
    server2Port = 3700;

var http = require('http');

// Setup server principal
(function() {
    var server = http.createServer(function(req, res) {
        var status = 200,
            headers = { 'content-type': 'application/json' },
            data = {};
        
        switch (req.url) {
            case '/user':
                data = { name: 'Charlie' };
                break;
        }
        
        res.writeHead(status, headers);
        res.end(JSON.stringify(data));
    });
    server.listen(serverPort, '127.0.0.1');
})();

var HttpClient = require('../src/httpclient.js');

var api = new HttpClient({
    protocol: 'http',
    host: '127.0.0.1',
    port: serverPort
});

exports.request = {
    'GET': function(test) {
        var server2 = http.createServer(function(req, res) {
            test.equal(req.method, 'GET');
            test.equal(req.url, '/path');
            test.equal(req.headers.foo, 'bar');
            
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end('ok');
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                protocol: 'http',
                host: '127.0.0.1',
                port: server2Port
            });
            
            api2.get(null, '/path', { headers: { foo: 'bar' } }, {}, function(res) {
                // ✅ Attendre que le serveur soit complètement fermé
                server2.close(function() {
                    test.done();
                });
            });
        });
    },
    
    // 'GET with querystring data and base path': function(test) {
    //     test.expect(2);
        
    //     var server2 = http.createServer(function(req, res) {
    //         test.equal(req.method, 'GET');
    //         test.equal(req.url, '/api/user?name=charlie');
            
    //         res.writeHead(200, { 'content-type': 'text/plain' });
    //         res.end('ok');
    //     });
        
    //     server2.listen(server2Port, '127.0.0.1', function() {
    //         var api2 = new HttpClient({
    //             protocol: 'http',
    //             host: '127.0.0.1',
    //             port: server2Port,
    //             path: '/api'
    //         });
            
    //         api2.get(null, '/user', { data: { name: 'charlie' } }, {}, function(res) {
    //             // ✅ Attendre que le serveur soit complètement fermé
    //             server2.close(function() {
    //                 test.done();
    //             });
    //         });
    //     });
    // },

    'GET with 204 no content': function(test) {
        var server2 = http.createServer(function(req, res) {            
            res.writeHead(204);
            res.end();
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                protocol: 'http',
                host: '127.0.0.1',
                port: server2Port,
                path: '/api'
            });
            
            api2.get(null, '/', function(res) {
                test.same(res.data, undefined);
                // ✅ Attendre que le serveur soit complètement fermé
                server2.close(function() {
                    test.done();
                });
            });
        });
    },
    
    'POST with data': function(test) {
        test.expect(4);
        
        var server2 = http.createServer(function(req, res) {
            var data = '';
            req.on('data', function(chunk) {
                data += chunk;
            });
            
            req.on('end', function() {
                test.equal(req.method, 'POST');
                test.equal(req.url, '/form');
                test.equal(req.headers.color, 'red');
                test.equal(data, 'test');
            
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end('ok');
            });
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                protocol: 'http',
                host: '127.0.0.1',
                port: server2Port
            });
            
            api2.post(null, '/form', { headers: { color: 'red' }, data: 'test' }, {}, function(res) {
                server2.close(function() {
                    test.done();
                });
            });
        });
    },
    
    // 'POST with data as object': function(test) {
    //     test.expect(3);
        
    //     var dataToSend = { name: 'Charlie' };
        
    //     var server2 = http.createServer(function(req, res) {
    //         var data = '';
    //         req.on('data', function(chunk) {
    //             data += chunk;
    //         });
            
    //         req.on('end', function() {
    //             test.equal(req.method, 'POST');
    //             test.equal(req.url, '/form');
    //             test.equal(data, JSON.stringify(dataToSend));
            
    //             res.writeHead(200, { 'content-type': 'text/plain' });
    //             res.end('ok');
    //         });
    //     });
        
    //     server2.listen(server2Port, '127.0.0.1', function() {
    //         var api2 = new HttpClient({
    //             protocol: 'http',
    //             host: '127.0.0.1',
    //             port: server2Port
    //         });
            
    //         api2.post(null, '/form', { data: dataToSend }, {}, function(res) {
    //             server2.close(function() {
    //                 test.done();
    //             });
    //         });
    //     });
    // }
};

exports.main = {
    
    'adds parsed json to the response.data': function(test) {
        test.expect(1);
        
        api.get(test, '/user', function(res) {
            test.deepEqual(res.data, { name: 'Charlie' });
            test.done();
        });
    },
    
    'doesnt run tests if falsey value passed instead of assert object': function(test) {
        test.expect(0);
        
        api.get(null, '/user', {}, { status: 'foobar' }, function(res) {
            test.done();
        });
    }
};

exports.response = {
    'status': function(test) {
        test.expect(2);
        
        var status = 200;
        
        var mockTest = {
            equal: function(actual, expected) {
                test.equal(actual, status);
                test.equal(expected, status);
            },
            done: function() {
                test.done();
            }
        };
        
        api.get(mockTest, '/user', {}, { status: status });
    },
    
    'headers': function(test) {
        test.expect(2);
        
        var type = 'application/json';
        
        var mockTest = {
            equal: function(actual, expected) {
                test.equal(actual, type);
                test.equal(expected, type);
            },
            done: function() {
                test.done();
            }
        };
        
        api.get(mockTest, '/user', {}, { 
            headers: {
                'content-type': type
            }
        });
    },
    
    'body': function(test) {
        test.expect(2);
        
        var body = JSON.stringify({ name: 'Charlie' });
        
        var mockTest = {
            equal: function(actual, expected) {
                test.equal(actual, body);
                test.equal(expected, body);
            },
            done: function() {
                test.done();
            }
        };
        
        api.get(mockTest, '/user', {}, { body: body });
    },
    
    'data': function(test) {
        test.expect(2);
        
        var data = { name: 'Charlie' };
        
        var mockTest = {
            deepEqual: function(actual, expected) {
                test.deepEqual(actual, data);
                test.deepEqual(expected, data);
            },
            done: function() {
                test.done();
            }
        };
        
        api.get(mockTest, '/user', {}, { data: data });
    }
};

exports.defaultResponseTests = {
    'status': function(test) {
        test.expect(2);
        
        var status = 200;
        
        var api2 = new HttpClient({
            protocol: 'http',
            host: '127.0.0.1',
            port: serverPort, 
            status: status
        });
        
        var mockTest = {
            equal: function(actual, expected) {
                test.equal(actual, status);
                test.equal(expected, status);
            }
        };
        
        api2.get(mockTest, '/user', function(res) {
            test.done();
        });
    },
    
    'headers': function(test) {
        test.expect(2);
        
        var type = 'application/json';
        
        var api2 = new HttpClient({
            protocol: 'http',
            host: '127.0.0.1',
            port: serverPort, 
            headers: {
                'content-type': type
            }
        });
        
        var mockTest = {
            equal: function(actual, expected) {
                test.equal(actual, type);
                test.equal(expected, type);
            }
        };

        api2.get(mockTest, '/user', function(res) {
            test.done();
        });
    }
};
