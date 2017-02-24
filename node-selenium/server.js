'use strict';

const express = require('express');
const pkill = require('pkill');
const app     = express();
const selenium = require('selenium-standalone');
var lastLaunch = new Date();
var myChild = null;
 
app.get('/start', function (req, res) {
    if(typeof(req.query['time']) == 'undefined' || new Date('@' + req.query['time']) < lastLaunch) {
        if(myChild != null) {
            myChild.kill();
            myChild = null;
        }
        pkill.full('chrome');
        pkill.full('selenium-standalone');
        lastLaunch = null;
        selenium.install({
            version: '3.0.1',
            logger: function (message) { console.log(message); }
        }, function (err) {
            console.log(err);
            selenium.start({
                version: '3.0.1',
                spawnCb: function () { console.log('spawned'); }
            }, function (err, child) {
                myChild = child;
                child.stderr.on('data', function(data){
                    console.log(data.toString());
                    if(data.indexOf('Selenium Server is up and running') > -1) {
                        res.send('started');
                    }
                });
                if(lastLaunch == null) {
                    lastLaunch = new Date();
                }
                console.log(err);
            });
        });
    }
    else {
        res.send("Nothing to do.");
    }
});


app.listen(8080);
console.log('Daemon: Running on http://localhost:' + 8080);
