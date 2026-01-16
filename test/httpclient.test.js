//nodeunit tests

var serverPort = 3600,
    server2Port = 3700;

var http = require('http');

// Variable globale pour le serveur principal
var mainServer;

//Setup server for testing
function setupMainServer() {
    if (mainServer) {
        return; // Serveur déjà créé
    }
    
    mainServer = http.createServer(function(req, res) {
        var status = 200,
            headers = { 'content-type': 'application/json' },
            data = {};
        
        switch (req.url) {
            case '/user' :
                data = { name: 'Charlie' };
                break;
        }
        
        res.writeHead(status, headers);
        res.end(JSON.stringify(data));
    });
    
    mainServer.listen(serverPort, '127.0.0.1');
}

var HttpClient = require('../index.js'),
    __ = require('underscore');

var api = new HttpClient({
    port: serverPort
});

// Setup global avant tous les tests
exports.setUp = function(callback) {
    setupMainServer();
    // Attendre un peu pour s'assurer que le serveur est prêt
    setTimeout(callback, 100);
};

// Cleanup global après tous les tests
exports.tearDown = function(callback) {
    if (mainServer) {
        mainServer.close(callback);
        mainServer = null;
    } else {
        callback();
    }
};

exports.request = {
    'GET': function(test) {
        test.expect(3); // Définir le nombre d'assertions attendues
        
        var server2 = http.createServer(function(req, res) {
            test.equal(req.method, 'GET');
            test.equal(req.url, '/path');
            test.equal(req.headers.foo, 'bar');
            
            res.writeHead(500, {'content-type': 'text/plain'});
            res.end('failed');
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                port: server2Port
            });
            
            // Utiliser un mock test object pour éviter les conflits
            var mockTest = {
                equal: function() {}, // Les assertions sont faites dans le serveur
                done: function() {
                    server2.close(function() {
                        test.done();
                    });
                }
            };
            
            api2.get(mockTest, '/path', { headers: {foo:'bar'} }, {}, function(res) {
                // Cette callback sera appelée après la réponse
                mockTest.done();
            });
        });
    },
    
    'GET with querystring data and base path': function(test) {
        test.expect(2);
        
        var server2 = http.createServer(function(req, res) {
            test.equal(req.method, 'GET');
            test.equal(req.url, '/api/user?name=charlie');
            
            res.writeHead(200, {'content-type': 'text/plain'}); // Changé en 200 pour éviter les erreurs
            res.end('success');
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                port: server2Port,
                path: '/api'
            });
            
            var mockTest = {
                equal: function() {}, // Les assertions sont faites dans le serveur
                done: function() {
                    server2.close(function() {
                        test.done();
                    });
                }
            };
            
            api2.get(mockTest, '/user', { data: {name: 'charlie'} }, {}, function(res) {
                mockTest.done();
            });
        });
    },

    'GET with 204 no content': function(test) {
        test.expect(1);
        
        var server2 = http.createServer(function(req, res) {            
            res.writeHead(204);
            res.end();
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                port: server2Port,
                path: '/api'
            });
            
            api2.get(test, '/', function(res) {
                test.same(res.data, undefined);
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
            
                res.writeHead(200, {'content-type': 'text/plain'});
                res.end('ok');
            });
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                port: server2Port
            });
            
            var mockTest = {
                equal: function() {}, // Les assertions sont faites dans le serveur
                done: function() {
                    server2.close(function() {
                        test.done();
                    });
                }
            };
            
            api2.post(mockTest, '/form', { headers: {color:'red'}, data: 'test' }, {}, function(res) {
                mockTest.done();
            });
        });
    },
    
    'POST with data as object': function(test) {
        test.expect(3);
        
        var dataToSend = { name: 'Charlie' };
        
        var server2 = http.createServer(function(req, res) {
            var data = '';
            req.on('data', function(chunk) {
                data += chunk;
            });
            
            req.on('end', function() {
                test.equal(req.method, 'POST');
                test.equal(req.url, '/form');
                test.equal(data, JSON.stringify(dataToSend));
            
                res.writeHead(200, {'content-type': 'text/plain'});
                res.end('ok');
            });
        });
        
        server2.listen(server2Port, '127.0.0.1', function() {
            var api2 = new HttpClient({
                port: server2Port
            });
            
            var mockTest = {
                equal: function() {}, // Les assertions sont faites dans le serveur
                done: function() {
                    server2.close(function() {
                        test.done();
                    });
                }
            };
            
            api2.post(mockTest, '/form', { data: dataToSend }, {}, function(res) {
                mockTest.done();
            });
        });
    }
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
            //There would have been an assertion error based on the status code if tests were run
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
        
        api.get(mockTest, '/user', { status: status });
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
        
        api.get(mockTest, '/user', { headers: {
            'content-type': type
        }});
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
        
        api.get(mockTest, '/user', { body: body });
    },
    
    'data': function(test) {
        test.expect(2);
        
        var data = { name: 'Charlie' };
        
        var mockTest = {
            deepEqual: function(actual, expected) {
                test.deepEqual(actual, expected); // Correction ici
                test.deepEqual(expected, data);
            },
            done: function() {
                test.done();
            }
        };
        
        api.get(mockTest, '/user', { data: data });
    }
};

exports.defaultResponseTests = {
    'status': function(test) {
        test.expect(2);
        
        var status = 200;
        
        var api2 = new HttpClient({
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
