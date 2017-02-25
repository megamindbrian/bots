const csv = require('csv');
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
            // TODO check last update time
            console.log('Google: Loading contacts from cache');
            try {
                var options = {
                    relax: true,
                    columns: true,
                    relax_column_count: true,
                    skip_empty_lines: true
                };
                var parser = csv.parse(options, function (err, data) {
                    if(err) { console.log(err); }
                    var rows = data.map(function (data) {
                        return {
                            type: 'contacts',
                            contacts: data['Name'].substr(0, 1).match(/[a-z]/ig)
                                ? data['Name'].substr(0, 1).toUpperCase()
                                : '_',
                            name: data['Name'],
                            email: data['E-mail 1 - Value'],
                            phone: data['Phone 1 - Value'],
                            title: data['Organization 1 - Name']
                        };
                    });
                    cb(rows);
                });
                fs.createReadStream('/data/contacts/google.csv', {encoding: 'utf16le'}).pipe(parser);
            }
            catch (e)
            {
                console.log(e);
            }
        }

        return this.getGoogleContacts();
    }

    commands.loginGoogle = loginGoogle;
    commands.getGoogleTimeline = getGoogleTimeline;
    commands.syncGoogleContacts = syncGoogleContacts;
    commands.getGoogleContacts = getGoogleContacts;

    return commands;
};