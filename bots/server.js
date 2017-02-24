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
var modules = ['google', 'linkedin', 'processes'];

function createClient(cb) {
	if (client != null) {
        client.end();
        client = null;
    }
    console.log('Daemon: Initializing webdriver instance on ' + webdriverServer.host);
	client = webdriverio.remote(webdriverServer);
	//client.timeouts('script', 10000);
	client.on('error', function (e) {
		console.log(e);
		this.endAll();
		cb();
	});
	client.on('end', function () {
        console.log('Daemon: Closing browser');
		cb();
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
        pageLoadStrategy: 'eager'
    };

    if(webdriverServer.host != 'localhost') {
        webdriverServer.desiredCapabilities = {
            browserName: 'chrome',
            chromeOptions: {
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

io.on('connection', function(socket){

    socket.on('sync', function (room) {
        console.log('Daemon: Received request for ' + room + ' sync');

        socket.join(room);
        if(webdriverServer == null) {
            createProfile();
        }

        startSeleniumServer(function () {
            createClient(function () {
                console.log('Daemon: All done with ' + room);
                io.sockets.in(room).emit('clear', {type: 'processes', processes: 'Tabs'});
            });
            console.log('Daemon: Client initialized, running ' + room);
            client[room](function (data) {
                console.log('Daemon: Sending results');
                io.sockets.in(room).emit('data', data);
            });
        });
    });

    socket.on('done', function (room) {
        socket.leave(room);
    });

});

app.use('/', express.static('static'));

app.get('*', function (req, res) {
    res.sendFile(__dirname + '/static/index.html');
});

server.listen(8080);
console.log('Daemon: Running on http://localhost:' + 8080);
