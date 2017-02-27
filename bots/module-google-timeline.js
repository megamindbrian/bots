const path = require( 'path' );
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
var timelineCache = {};

module.exports = function (getCredentials) {

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
        for (var c = 0; c < 32; c++) {
            if (count < 3) {
                result = result.readTimelinePage(cb)
                    .click('.previous-date-range-button')
                    .pause(1000)
            }
        }
        return result;
    }

    function readTimelinePage(cb) {
        var day, lastTime, currDate;
        return this.getText('.timeline-title')
            .then(function (text) {
                day = text;
                currDate = new Date(day);
                return this.getText('.timeline-subtitle');
            })
            .then(function (text) {
                if (text != '') {
                    day = text;
                    currDate = new Date(day);
                }
                var newKey = currDate.getDate() + months[currDate.getMonth()] + (currDate.getFullYear() + '').substr(2, 2);
                if (newKey != dayKey) {
                    dayKey = newKey;
                }
            })
            .elements('.timeline-item ~ [jsinstance]')
            .then(function (els) {
                var result = this;
                for (var e = 0; e < els.value.length; e++) {
                    result = result.readTimelineRow(day, dayKey, els.value[e]);
                }
                return result;
            })
            .then(function () {
                cb({
                    type: 'timeline',
                    timeline: dayKey,
                    clear: true
                });
                cb(timelineCache[dayKey]);
            })
            .catch(function (e) {
                if (e.type != 'NoSuchElement')
                    console.log(e);
            })
    }

    function readTimelineRow(day, dayKey, elem) {
        var title, text, start, end;
        return this.elementIdElement(elem.ELEMENT, '.place-visit-title')
            .then(function (el) {
                // Location items
                start = null;
                end = null;
                if (el.value) {
                    return this.elementIdText(el.value.ELEMENT);
                }
                else {
                    // Driving items
                    return this.elementIdElement(elem.ELEMENT, '.timeline-item')
                        .then(function (el) {
                            return this.elementIdAttribute(el.value.ELEMENT, 'data-segment-key');
                        })
                        .then(function (attr) {
                            if(attr.value) {
                                var timelineData = attr.value.split(':');
                                start = new Date(parseFloat(timelineData[1]));
                                end = new Date(parseFloat(timelineData[2]));
                            }
                            return this.elementIdElement(elem.ELEMENT, '.timeline-item-title-content');
                        })
                        .then(function (el) {
                            return this.elementIdText(el.value.ELEMENT);
                        });
                }
            })
            .then(function (el) {
                title = el.value;
                return this.elementIdElement(elem.ELEMENT, '.timeline-item-text');
            })
            .then(function (el) {
                if(el.value) {
                    return this.elementIdText(el.value.ELEMENT);
                }
            })
            .then(function (el) {
                if(el) {
                    text = el.value;
                }
                return this.elementIdElement(elem.ELEMENT, '.duration-text');
            })
            .then(function (el) {
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                var duration = el.value;
                start = start || new Date(day + ' ' + duration.split('-')[0]);
                end = end || new Date(day + ' ' + duration.split('-')[1]);
                var length = end.getTime() - start.getTime();
                var newRow = {
                    type: 'timeline',
                    timeline: dayKey,
                    name: title,
                    location: text,
                    time: start,
                    length: isNaN(length) ? 0 : length
                };
                if (typeof timelineCache[newRow.timeline] == 'undefined') {
                    timelineCache[newRow.timeline] = [newRow];
                }
                else {
                    timelineCache[newRow.timeline] = timelineCache[newRow.timeline]
                        .filter(function (i) {
                            return i.time != newRow.time;
                        })
                        .concat([newRow]);
                }
            })
            .catch(function (e) {
                console.log(e);
            });
    }

    function downloadGoogleLocations(cb)
    {
        return this.url('https://www.google.com/settings/takeout/custom/location_history')
            .loginGoogle()
            .click('[aria-label*="Settings"]')
            .pause(100);
        // TODO: finish this
    }

    function syncGoogleTimeline(cb)
    {
        // load timeline cache
        if(fs.existsSync('/data/timeline')) {
            fs.readdir('/data/timeline', function (err, files) {
                if (err) {
                    console.error("Could not list the directory.", err);
                }
                files.forEach(function (file) {
                    // Make one pass and make the file complete
                    if (!file.match(/timeline-[0-9]{1,2}[a-z]{3}[0-9]{2}\.json/i)) {
                        return;
                    }
                    var fromPath = path.join('/data/timeline', file);
                    var events = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
                    for (var e = 0; e < events.length; e++) {
                        if (typeof timelineCache[events[e].timeline] == 'undefined') {
                            timelineCache[events[e].timeline] = [events[e]];
                        }
                        else {
                            timelineCache[events[e].timeline] = timelineCache[events[e].timeline]
                                .filter(function (i) {
                                    return i.time != events[e].time;
                                })
                                .concat([events[e]]);
                        }
                    }
                });
                for(var c in timelineCache) {
                    if(timelineCache.hasOwnProperty(c)) {
                        cb({
                            type: 'timeline',
                            timeline: c,
                            clear: true
                        });
                        cb(timelineCache[c]);
                    }
                }
            });
        }

        return this
            .getGoogleTimeline(cb)
            //.downloadGoogleLocations()
            .endAll()
            .then(function () {
                // keep a cache of locations
                if(fs.existsSync('/data/timeline')) {
                    for (var e in timelineCache) {
                        if (timelineCache.hasOwnProperty(e)) {
                            var toPath = path.join('/data/timeline', 'timeline-' + e + '.json');
                            fs.writeFileSync(toPath, JSON.stringify(timelineCache[e], null, 2), 'utf8');
                        }
                    }
                }
            //    fs.createReadStream('/data/downloads/google.csv')
            //        .pipe(fs.createWriteStream('/data/contacts/google.csv'))
            //        .on('finish', function () {
            //            fs.unlinkSync('/data/downloads/google.csv')
            //        });
            });
    }

    commands.downloadGoogleLocations = downloadGoogleLocations;
    commands.readTimelineRow = readTimelineRow;
    commands.getGoogleTimeline = getGoogleTimeline;
    commands.readAllPages = readAllPages;
    commands.readTimelinePage = readTimelinePage;
    commands.syncGoogleTimeline = syncGoogleTimeline;

    return commands;
};