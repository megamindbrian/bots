'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs');
//const request = require('request');
const cheerio = require('cheerio');
const app = express();
const webdriverio = require('webdriverio');

//const session = require('session');
var client = null;


app.get('/sync-history', function (req, res) {
    if (client != null) {
        client.end();
        client = null;
    }
    var options = {
        host: 'selenium',
        port: 8080,
        path: '/start',
        accept: '*/*'
    };

    // start the selenium server
    http.get(options, function (getRes) {

        getRes.on('data', function () {
            client = webdriverio.remote({
                host: 'selenium',
                port: 4444,
                browserName: 'chrome',
                pageLoadStrategy: 'eager'
            });

            client = client.init();

            client.addCommand('googleLogin', function googleLogin() {
                return this.isExisting('h1*=One account')
                    .then(function (is) {
                        if (is) {
                            console.log('google sign in required');
                            return this
                                .waitForVisible('input[name="Email"]')
                                .addValue('input[name="Email"]', ‘email-secret’)
                                .submitForm('#gaia_loginform')
                                .waitForVisible('input[name="Passwd"]', 5000).then(function () {
                                    console.log('require password');
                                })
                                .addValue('input[name="Passwd"]', ‘password-secret’)
                                .submitForm('#gaia_loginform');
                        }
                    });
            });
            client
                .url('https://www.google.com/maps/timeline')
                .googleLogin()
                .waitUntil(function () {
                    return client.url().then(function (url) {
                        return url.indexOf('timeline') > -1;
                    });
                }, 20000)
                .pause(10000)
                .endAll()
                .then(function () {
                    console.log('all done');
                    res.send('all done');
                });
        });

        getRes.on('error', function (err) {
            res.send(err);
        });

    });
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
