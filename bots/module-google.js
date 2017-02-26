const csv = require('csv');
const fs = require('fs');
const ical = require('ical');
const cal = require('ical-generator')({
        domain: '',
        prodId: {company: 'megamind-industries', product: 'ical-generator'},
        name: 'Timeline',
        timezone: 'US/Phoenix'
    });
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var commands = {}, dayKey = '';

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

    function getGoogleTimeline(cb) {
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
            .pause(3000)
            .click('button[jsaction="select-today"]')
            .pause(1000)
            .readAllPages(cb);
    }

    var count = 0;
    function readAllPages(cb) {
        // TODO: add stop conditions
        var result = this;
        dayKey = '';
        for(var c = 0; c < 10; c++) {
            if(count < 3) {
                result = result.readTimelinePage(cb)
                    .click('.previous-date-range-button')
                    .pause(1000)
            }
        }
        return result.endAll();
    }

    function readTimelinePage(cb)
    {
        var day, lastTime, currDate;
        var client = this;
        return this.getText('.timeline-title')
            .then(function (text) {
                day = text;
                currDate = new Date(day);
                return this.getText('.timeline-subtitle');
            })
            .then(function (text) {
                if(text != '') {
                    day = text;
                    currDate = new Date(day);
                }
                var newKey = months[currDate.getMonth()] + (currDate.getFullYear() + '').substr(2,2);
                if(newKey != dayKey) {
                    dayKey = newKey;
                    cb({
                        type: 'timeline',
                        timeline: dayKey,
                        clear: true
                    });
                }
            })
            .elements('.timeline-item ~ [jsinstance]')
            .then(function (els) {
                var result = this;
                for(var e = 0; e < els.value.length; e++) {
                    result = result.readTimelineRow(day, dayKey, els.value[e], cb);
                }
                return result;
            })
            .catch(function (e) {
                if(e.type != 'NoSuchElement')
                    console.log(e);
            })
    }

    function readTimelineRow(day, dayKey, elem, cb)
    {
        var title, text;
        return this.elementIdElement(elem.ELEMENT, '.place-visit-title')
            .then(function (el) {
                if (el.value) {
                    return this.elementIdText(el.value.ELEMENT)
                        .then(function (el) {
                            title = el.value;
                            return this.elementIdElement(elem.ELEMENT, '.timeline-item-text');
                        })
                        .then(function (el) {
                            return this.elementIdText(el.value.ELEMENT);
                        })
                        .then(function (el) {
                            text = el.value;
                            return this.elementIdElement(elem.ELEMENT, '.duration-text');
                        })
                        .then(function (el) {
                            return this.elementIdText(el.value.ELEMENT);
                        })
                        .then(function (el) {
                            var duration = el.value;
                            var start = new Date(day + ' ' + duration.split('-')[0]);
                            var end = new Date(day + ' ' + duration.split('-')[1]);
                            var length = end.getTime() - start.getTime();
                            var newRow = {
                                type: 'timeline',
                                timeline: dayKey,
                                name: title,
                                location: text,
                                time: start,
                                length: isNaN(length) ? 0 : length
                            };
                            console.log(newRow);
                            cb(newRow);
                        });
                }
            })
            .catch(function (e) {
                console.log(e);
            });
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
                var parser = csv.parse(options, function (err, contacts) {
                    if(err) { console.log(err); }
                    var groups = {};
                    for(var i = 0; i < contacts.length; i++) {
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
                        if(typeof groups[group] == 'undefined') {
                            groups[group] = [{
                                type: 'contacts',
                                contacts: group,
                                clear:true
                            }];
                        }
                        groups[group][groups[group].length] = row;
                    }
                    for(var g in groups) {
                        if(groups.hasOwnProperty(g)) {
                            cb(groups[g]);
                        }
                    }
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

    function syncGoogleTimeline(cb)
    {

        return this.getGoogleTimeline(cb);
    }

    commands.loginGoogle = loginGoogle;
    commands.readTimelineRow = readTimelineRow;
    commands.getGoogleTimeline = getGoogleTimeline;
    commands.readAllPages = readAllPages;
    commands.readTimelinePage = readTimelinePage;
    commands.syncGoogleTimeline = syncGoogleTimeline;
    commands.syncGoogleContacts = syncGoogleContacts;
    commands.getGoogleContacts = getGoogleContacts;

    return commands;
};