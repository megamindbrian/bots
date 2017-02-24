'use strict';

const http = require('http');
const express = require('express');
const fs = require('fs');
//const request = require('request');
const cheerio = require('cheerio');
const app = express();
//const webdriverio = require('webdriverio');

//const session = require('session');
var client = null;

// App
const colors = ['#99000', '#009900', '#000099', '#999999'];

function getRandomColor() {
    return colors[Math.round(Math.random() * (colors.length - 1))];
}

app.get('/colors', function (req, res) {
    res.send('<body style="background-color:' + getRandomColor() + ';"></body>');
});

exports.getRandomColor = getRandomColor;

app.listen(8080);
console.log('Daemon: Running on http://localhost:' + 8080);


