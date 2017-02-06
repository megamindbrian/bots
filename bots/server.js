'use strict';

// java -Dwebdriver.chrome.driver=chromedriver.exe -jar selenium-server-standalone-3.0.1.jar

const http = require('http');
const express = require('express');
const fs = require('fs');
const cheerio = require('cheerio');
const app = express();
const webdriverio = require('webdriverio');
const FirefoxProfile = require('firefox-profile');
const profilePath = __dirname + '/defaultProfile';
const zlib = require('zlib');
const crypto = require('crypto');
const Readable = require('stream').Readable;
var passwordsPassword = 'd6F3Efeq';
var myProfile = new FirefoxProfile(profilePath);
myProfile.setPreference("general.useragent.override", "custom-user-agent");
var webdriverServer;
var seleniumControlServer;

var passAdd = false;
var passUpdate = false;
for(var index in process.argv) {
	if(process.argv.hasOwnProperty(index)) {
		var val = process.argv[index];
		if(val.indexOf('--add-pass') > -1) {
			passAdd = val.substr(11);
		}
		if(val.indexOf('--update-pass') > -1) {
			passAdd = val.substr(14);
			passUpdate = true;
		}
		if(val.indexOf('--password') > -1) {
			passwordsPassword = val.substr(11);
		}
	}
}

function encrypt(text) {
  var cipher = crypto.createCipher('aes-256-ctr', passwordsPassword);
  var crypted = cipher.update(text, 'latin1', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text) {
  var decipher = crypto.createDecipher('aes-256-ctr', passwordsPassword);
  var dec = decipher.update(text, 'hex', 'latin1');
  dec += decipher.final('latin1');
  return dec;
}

function decryptSet(set) {
	var resultSet = {};
	for(var i in set) {
		if(set.hasOwnProperty(i)) {
			if(i == 'added' || i == 'host') {
				resultSet[i] = set[i];
				continue;
			}
			resultSet[i] = decrypt(set[i]);
		}
	}
	return resultSet;
}

function encryptSet(set) {
	var resultSet = {};
	for(var i in set) {
		if(set.hasOwnProperty(i)) {
			if(i == 'added' || i == 'host') {
				resultSet[i] = set[i];
				continue;
			}
			resultSet[i] = encrypt(set[i]);
		}
	}
	return resultSet;
}

// load existing passwords file
var passwords;
if(fs.existsSync('passwords.json')) {
	var file = fs.readFileSync('passwords.json', 'latin1');
	if(file.length > 0) {
		try {
			console.log('reading encrypted passwords file');
			//var uncompressed = zlib.gunzipSync(Buffer.from(decrypted, 'base64'));
			passwords = JSON.parse(file);
		}
		catch (e) {
			console.log(e);
			passwords = [];
		}
	}
	else {
		passwords = [];
	}
}
else {
	passwords = [];
}

// modify passwords file
if(passAdd) {
	var passwordAddJson;
	if(passAdd.substr(0, 1) == '{') {
		passwordAddJson = JSON.parse(passAdd);
	}
	else if(fs.existsSync(passAdd)) {
		var content = fs.readFileSync(passAdd);
		passwordAddJson = JSON.parse(content);
	}
	else {
		passwordAddJson = JSON.parse(Base64.decode(passAdd));
	}
	if(typeof passwordAddJson == 'object') {
		passwordAddJson.added = new Date();
		var encrypted = encryptSet(passwordAddJson);
		if(passUpdate && passwordAddJson.host) {
			passwords = passwords.filter(function (el) {
				return el.host != passwordAddJson.host;
			});
		}
		passwords[passwords.length] = encrypted;
		var passwordString = JSON.stringify(passwords);
		//var compressed = zlib.gzipSync(passwordString).toString('base64');
		console.log('saving encrypted file');
		fs.writeFileSync('passwords-new.json', passwordString);
		fs.renameSync('passwords.json', 'passwords-backup.json');
		fs.renameSync('passwords-new.json', 'passwords.json');
		fs.unlinkSync('passwords-backup.json');
		if(fs.existsSync(passAdd)) {
			console.log('deleting input file: ' + passAdd);
			fs.unlinkSync(passAdd);
		}
	}
	process.exit();
}


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

var client = null;

function googleLogin() {
	return this.isExisting('h1*=One account')
		.then(function (is) {
			if (is) {
				console.log('google sign in required');
				var credentials = decryptSet(passwords.filter(function (el) {
					return el.host == 'accounts.google.com';
				})[0] || {});
				return this
					.waitForVisible('input[name="Email"]')
					.addValue('input[name="Email"]', credentials.Email)
					.submitForm('#gaia_loginform')
					.waitForVisible('input[name="Passwd"]', 5000)
					.then(function () {
						console.log('require password');
					})
					.catch(function () {
						console.log('could not log in');
					})
					.addValue('input[name="Passwd"]', credentials.Passwd)
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
			return client.getUrl().then(function(url) {
				return url.indexOf('timeline') > -1;
			});
		}, 20000, '')
		.catch(function (e) {
			console.log(e);
			console.log('Cannot reach timeline');
		})
		.pause(10000)
		.endAll();
}

app.get('/sync-history', function (req, res) {

	console.log('received request for history sync');
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
