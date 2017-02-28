'use strict';

// java -Dwebdriver.chrome.driver=chromedriver.exe -jar selenium-server-standalone-3.0.1.jar

const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const getCredentials = require('./passwords');

const webdriverio = require('webdriverio');
const profilePath = process.env.WEBDRIVER_HOST ? '/usr/profile' : __dirname + '/defaultProfile';

// set up profile
var webdriverServer = null;
var seleniumControlServer = null;
var client = null;
var modules = ['google', 'google-contacts', 'google-timeline', 'linkedin', 'linkedin-messages', 'processes'];
var tabCache = [];
var pipeCache = [];

const clearTabs = {
    type:'processes',
    clear: true,
    processes: 'Tabs'
};

function createClient(cb) {
	if (client != null) {
        client.end();
        client = null;
    }
    console.log('Daemon: Initializing webdriver instance on ' + webdriverServer.host);
	client = webdriverio.remote(webdriverServer);
	client.on('error', function (e) {
		console.log(e);
		this.endAll();
		cb();
	});
	client.on('end', function () {
        console.log('Daemon: Closing browser');
		cb();
	});
	client.on('result', function (result) {

	    try {
            //console.log(result.requestOptions.method + ' ' + result.requestOptions.uri.href + ' = ' + JSON.stringify(result.body.value, null, 4));

            if (result.requestOptions.uri.href.indexOf('/window_handles') > -1) {
                io.sockets.in('syncProcesses').emit('data', clearTabs);
                tabCache = result.body.value.map(function (i) {
                    return {
                        type: 'processes',
                        id: i,
                        name: '',
                        status: 'inactive',
                        processes: 'Tabs'
                    };
                });
                io.sockets.in('syncProcesses').emit('data', tabCache);
            }
            else if (result.requestOptions.uri.href.indexOf('/window_handle') > -1) {
                io.sockets.in('syncProcesses').emit('data', clearTabs);
                for (var t = 0; t < tabCache.length; t++) {
                    if (tabCache[t].id == result.body.value) {
                        tabCache[t].status = 'active';
                        io.sockets.in('syncProcesses').emit('data', tabCache);
                        break;
                    }
                }
            }
            else if (result.requestOptions.uri.href.indexOf('/url') > -1) {
                io.sockets.in('syncProcesses').emit('data', clearTabs);
                for (var t2 = 0; t2 < tabCache.length; t2++) {
                    if (tabCache[t2].status == 'active') {
                        tabCache[t2].url = result.body.value;
                        tabCache[t2].name = tabCache[t2].title + ' | ' + tabCache[t2].url;
                        io.sockets.in('syncProcesses').emit('data', tabCache);
                        break;
                    }
                }
                client.getTitle();
            }
            else if (result.requestOptions.uri.href.indexOf('/title') > -1) {
                io.sockets.in('syncProcesses').emit('data', clearTabs);
                for (var t3 = 0; t3 < tabCache.length; t3++) {
                    if (tabCache[t3].status == 'active') {
                        tabCache[t3].title = result.body.value;
                        tabCache[t3].name = tabCache[t3].title + ' | ' + tabCache[t3].url;
                        io.sockets.in('syncProcesses').emit('data', tabCache);
                        break;
                    }
                }
            }
            else if (result.requestOptions.uri.href.indexOf('/session/') > -1
                && result.requestOptions.method == 'DELETE') {
                tabCache = [];
                io.sockets.in('syncProcesses').emit('data', clearTabs);
            }
            else if (result.requestOptions.uri.href.match(/\/session$/)
                && result.requestOptions.method == 'POST') {
                io.sockets.in('syncProcesses').emit('data', clearTabs);
                tabCache[tabCache.length] = {
                    type: 'processes',
                    id: result.body.value['webdriver.remote.sessionid'],
                    name: '',
                    status: 'active',
                    processes: 'Tabs'
                };
                io.sockets.in('syncProcesses').emit('data', tabCache);
            }
        }
        catch (e) {
	        console.log(e);
        }
    });

    clientInit();
}

function clientInit() {
    client = client.init();

    for(var m in modules) {
        if(modules.hasOwnProperty(m)) {
            var module = require('./module-' + modules[m])(getCredentials);
            for(var f in module) {
                if(module.hasOwnProperty(f)) {
                    client.addCommand(f, module[f]);
                }
            }
        }
    }
}

function startSeleniumServer(cb) {
    // TODO: determine if we should initialize using the selenium service controller in Docker or just connected to selenium directly
    if (webdriverServer.host != 'localhost') {
        // start the selenium server
        console.log('Daemon: Connecting to control server: ' + seleniumControlServer.host);
        http.get(seleniumControlServer, function (getRes) {

            // wait for response from selenium server
            getRes.on('data', function () {
                cb();
            });

            getRes.on('error', function (err) {
                console.log(err);
            });
        });
    }
    else {
        cb();
    }
}

function createProfile() {
    webdriverServer = {
        debug: true,
        host: process.env.WEBDRIVER_HOST || 'localhost',
        port: 4444,
        pageLoadStrategy: 'eager',
        connectionRetryTimeout: 10000
    };

    if(webdriverServer.host != 'localhost') {
        webdriverServer.desiredCapabilities = {
            browserName: 'chrome',
            chromeOptions: {
                prefs: {
                    'download.default_directory' : '/data/downloads'
                },
                args: ['user-data-dir=' + profilePath]
            }
        };

        seleniumControlServer = {
            host: webdriverServer.host,
            port: 8080,
            path: '/start',
            accept: '*/*'
        };
    }
    else {
        webdriverServer.desiredCapabilities = {
            browserName: 'chrome',
            chromeOptions: {
                args: ['user-data-dir=' + profilePath]
            }
        };
    }
}

function emitSockets()
{
    io.sockets.in('syncProcesses').emit('data', {
        type:'processes',
        clear: true,
        processes: 'Pipes'
    });
    var sockets = [];
    var rooms = io.sockets.adapter.rooms;
    for(var s in io.sockets.sockets) {
        if(io.sockets.sockets.hasOwnProperty(s)) {
            var socket = {
                type: 'processes',
                processes: 'Pipes',
                id: io.sockets.connected[s].id,
                address: io.sockets.connected[s].handshake.address,
                status: io.sockets.connected[s].connected ? 'connected' : 'disconnected',
                time: io.sockets.connected[s].handshake.time,
                rooms: []
            };
            for(var r in rooms) {
                if(rooms.hasOwnProperty(r)) {
                    if(rooms[r].sockets[socket.id]) {
                        socket.rooms[socket.rooms.length] = r;
                    }
                }
            }
            socket.name = socket.address + ' | ' + socket.rooms.join(', ');
            sockets[sockets.length] = socket;
        }
    }
    pipeCache = sockets;
    io.sockets.in('syncProcesses').emit('data', pipeCache);
}

io.on('connection', function(socket) {

    console.log('Daemon: Client connected from ' + socket.handshake.address);
    socket.join('syncProcesses');
    emitSockets();

    socket.on('sync', function (room) {
        console.log('Daemon: Received request for ' + room + ' sync');

        socket.join(room);
        emitSockets();

        if(webdriverServer == null) {
            createProfile();
        }

        startSeleniumServer(function () {
            createClient(function () {
                console.log('Daemon: All done with ' + room);
            });
            console.log('Daemon: Client initialized, running ' + room);
            client[room](function (data) {
                console.log('Daemon: Sending results');
                io.sockets.in(room).emit('data', data);
            })
                .catch(function (e) {
                    console.log(e);
                });
        });
    });

    socket.on('done', function () {
        socket.disconnect();
        emitSockets();
    });

});

app.use('/', express.static('static'));

app.get('*', function (req, res) {
    res.sendFile(__dirname + '/static/index.html');
});

server.listen(8080);
console.log('Daemon: Running on http://localhost:' + 8080);
