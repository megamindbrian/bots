'use strict';

const mocha = require('mocha');
const assert = require('assert');
const server = require('./color');
const getRandomColor = server.getRandomColor;

describe('color test', function () {

    //before(function () {

    //});

    it('should be random', function () {
        var pass = false;
        for(var c = 0; c < 20; c++) {
            var first = getRandomColor();
            var second = getRandomColor();
            pass = pass || (first != second);
        }
        // color test
        /*
         if (first == '') {
         }
         else {

         asser(first != )
         }
         }
         */
        assert(pass);
    });

});
