const csv = require('fast-csv');
const fs = require('fs');

var commands = {};

module.exports = function (getCredentials) {

    function loginGoogle() {
        return this.isExisting('h1*=One account')
            .then(function (is) {
                if (is) {
                    console.log('Google: Sign in required');
                    var credentials = getCredentials('accounts.google.com');
                    return this
                        .waitForVisible('input[name="Email"]')
                        .addValue('input[name="Email"]', credentials.Email)
                        .submitForm('#gaia_loginform')
                        .waitForVisible('input[name="Passwd"]', 5000)
                        .then(function () {
                            console.log('Google: Require password');
                        })
                        .catch(function () {
                            console.log('Google: Could not log in');
                        })
                        .addValue('input[name="Passwd"]', credentials.Passwd)
                        .submitForm('#gaia_loginform');
                }
            });
    }

    function getGoogleContacts() {
        return this.url('https://www.google.com/contacts/')
            .loginGoogle()
            .waitUntil(function () {
                return this.getUrl().then(function (url) {
                    return url.indexOf('contacts') > -1;
                });
            }, 20000, '')
            .catch(function (e) {
                console.log(e);
                console.log('Google: Cannot reach contacts');
            })
            .pause(10000)
            .endAll();
    }

    function getGoogleTimeline() {
        console.log('Google: Logging timeline history');
        return this
            .url('https://www.google.com/maps/timeline')
            .loginGoogle()
            .waitUntil(function () {
                return this.getUrl().then(function (url) {
                    return url.indexOf('timeline') > -1;
                });
            }, 20000, '')
            .catch(function (e) {
                console.log(e);
                console.log('Google: Cannot reach timeline');
            })
            .pause(10000)
            .endAll();
    }

    function syncGoogleContacts(cb) {
        if(fs.existsSync('/data/contacts/google.csv')) {
            console.log('Google: Loading contacts from cache');
            csv
                .fromPath('/data/contacts/google.csv')
                .on('data', function (data) {
                    cb(data)
                })
                .on('end', function () {
                    console.log('Google: Done syncing contacts');
                });
        }

        return this.getGoogleContacts();
    }

    commands.loginGoogle = loginGoogle;
    commands.getGoogleTimeline = getGoogleTimeline;
    commands.syncGoogleContacts = syncGoogleContacts;
    commands.getGoogleContacts = getGoogleContacts;

    return commands;
};