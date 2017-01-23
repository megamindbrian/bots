'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs');
//const request = require('request');
const cheerio = require('cheerio');
const app = express();
const webdriverio = require('webdriverio');
const FirefoxProfile = require('firefox-profile');
const profilePath = __dirname + '/defaultProfile';
var myProfile = new FirefoxProfile(profilePath);
myProfile.setPreference("general.useragent.override", "custom-user-agent");
var webdriverServer;
var seleniumControlServer;
myProfile.encoded(function (profile) {
	webdriverServer = {
		debug: true,
		host: process.env.WEBDRIVER_HOST || 'localhost',
		port: 4444,
		pageLoadStrategy: 'eager',
		desiredCapabilities: {
			browserName: 'chrome',
			chromeOptions: {
				args: ['user-data-dir=' + profilePath]
			}
		},
		capabilities: [{
			browserName: 'firefox',
			firefox_profile: profile
		},
		{
			browserName: 'chrome'
		}]
	};
	
	if(webdriverServer.host != 'localhost') {
		seleniumControlServer = {
			host: webdriverServer.host,
			port: 8080,
			path: '/start',
			accept: '*/*'
		};
	}
});


//const session = require('session');
var client = null;

function googleLogin() {
	return this.isExisting('h1*=One account')
		.then(function (is) {
			if (is) {
				console.log('google sign in required');
				return this
					.waitForVisible('input[name="Email"]')
					.addValue('input[name="Email"]', 'email-secret')
					.submitForm('#gaia_loginform')
					.waitForVisible('input[name="Passwd"]', 5000)
					.then(function () {
						console.log('require password');
					})
					.catch(function () {
						console.log('could not log in');
					})
					.addValue('input[name="Passwd"]', 'password-secret')
					.submitForm('#gaia_loginform');
			}
		});
}

function createClient(cb)
{
	if (client != null) {
        client.end();
        client = null;
    }
	console.log('Creating webdriver instance');
	client = webdriverio.remote(webdriverServer);
	//client.timeouts('script', 10000);
	console.log('Initializing webdriver instance');
	client.on('error', function (e) {
		console.log(e);
		this.endAll();
		cb();
	});
	client.on('end', function () {
		console.log('closing client');
		cb();
	});
	client = client.init();
	client.addCommand('googleLogin', googleLogin);
}

function logTimelineHistory() {    
	console.log('Logging timeline history');
	client
		.url('https://www.google.com/maps/timeline')
		.googleLogin()
		.waitUntil(function () {
			return client.url().then(function (url) {
				return url.indexOf('timeline') > -1;
			});
		}, 20000)
		.catch(function () {
			console.log('Cannot reach timeline');
		})
		.pause(10000)
		.endAll();
}

app.get('/sync-history', function (req, res) {

	// special case for nested function, just because this procedure calls it from two different places
	var syncHistory = function () {
		createClient(function () {
			res.send('all done with history');
		});
		logTimelineHistory();
	};

	// determine if we should initialize using the selenium service controller in Docker or just connected to selenium directly
	if (webdriverServer.host != 'localhost') {
		// start the selenium server
		console.log('Connecting to control server: ' + seleniumControlServer.host);
		http.get(seleniumControlServer, function (getRes) {
			getRes.on('data', syncHistory);

			getRes.on('error', function (err) {
				res.send(err);
			});
		});
	}
	else {
		syncHistory();
	}
	
});

/*
 const selenium = require('selenium-standalone');

 selenium.start(function(err, child) {
 child.stderr.on('data', function(data){
 console.log(data.toString());
 });
 });
 */

app.listen(8080);
console.log('Running on http://localhost:' + 8080);
