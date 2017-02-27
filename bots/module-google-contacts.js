const csv = require('csv');
const fs = require('fs');
var commands = {};
var contactCache = {};

module.exports = function (getCredentials) {

    function getGoogleContacts() {

        return this.url('https://www.google.com/contacts/?cplus=0')
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
            .pause(3000)
            .click('div[role="button"] + div[role="button"] + div[role="button"]:last-of-type')
            .click('div[role="separator"] + div[role="menuitem"] + div[role="menuitem"]')
            .pause(1000)
            .click('button[name="ok"]')
            .pause(3000)
            .endAll()
            .then(function () {
                fs.createReadStream('/data/downloads/google.csv')
                    .pipe(fs.createWriteStream('/data/contacts/google.csv'))
                    .on('finish', function () {
                        fs.unlinkSync('/data/downloads/google.csv')
                    });
            });
    }

    function syncGoogleContacts(cb) {

        if (fs.existsSync('/data/contacts/google.csv')) {
            // TODO check last update time
            console.log('Google: Loading contacts from cache');
            try {
                var options = {
                    relax: true,
                    columns: true,
                    relax_column_count: true,
                    skip_empty_lines: true
                };
                var parser = csv.parse(options, function (err, contacts) {
                    if (err) {
                        console.log(err);
                    }
                    contactCache = {};
                    for (var i = 0; i < contacts.length; i++) {
                        var data = contacts[i];
                        var group = data['Name'].substr(0, 1).match(/[a-z]/ig)
                            ? data['Name'].substr(0, 1).toUpperCase()
                            : '_';
                        var row = {
                            type: 'contacts',
                            contacts: group,
                            name: data['Name'],
                            email: data['E-mail 1 - Value'],
                            phone: data['Phone 1 - Value'],
                            title: data['Organization 1 - Name']
                        };
                        if (typeof contactCache[group] == 'undefined') {
                            contactCache[group] = [{
                                type: 'contacts',
                                contacts: group,
                                clear: true
                            }];
                        }
                        contactCache[group][contactCache[group].length] = row;
                    }
                    for (var g in contactCache) {
                        if (contactCache.hasOwnProperty(g)) {
                            cb(contactCache[g]);
                        }
                    }
                });
                fs.createReadStream('/data/contacts/google.csv', {encoding: 'utf16le'}).pipe(parser);
            }
            catch (e) {
                console.log(e);
            }
        }

        return this.getGoogleContacts();
    }

    commands.syncGoogleContacts = syncGoogleContacts;
    commands.getGoogleContacts = getGoogleContacts;

    return commands;
};

