const standard = require('./standard.js');

var commands = {}, linkedinCache = {};
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dotw = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

module.exports = function (getCredentials) {

    function getLinkedInChats(cb) {
        console.log('LinkedIn: Logging linkedin history');
        return this
            .url('https://www.linkedin.com/')
            .loginLinkedIn()
            .waitUntil(function () {
                return this.getUrl().then(function(url) {
                    return url.indexOf('login') == -1;
                });
            }, 20000, '')
            .click('a[href*="/messaging"]')
            .pause(2000)
            // TODO: scroll to bottom of messages
            .elements('[data-control-name="view_message"]')
            .then(function (els) {
                var result = this, threads = [];
                console.log('LinkedIn: Loading threads: ' + els.value.length);
                for (var e = 0; e < els.value.length; e++) {
                    (function (elem) {
                        result = result
                            .elementIdAttribute(elem.ELEMENT, 'href')
                            .then(function (attr) {
                                threads[threads.length] = attr.value.split('/thread')[1];
                            })
                    })(els.value[e]);
                }
                return result.then(function () {
                    var result = this;
                    for(var t = 0; t < threads.length; t++) {
                        result = result.readLinkedInThread(threads[t], cb);
                        // TODO: archive thread
                    }
                    return result;
                });
            })
            .catch(function (e) { console.log(e); });
    }

    function readLinkedInThread(thread, cb) {
        var contact = '', name, url, phone, email, title;
        return this.click('a[href*="' + thread + '"]')
            .pause(1000)
            .click('[data-control-name="topcard"]')
            .pause(1000)
            .isExisting('[data-control-name="view_profile"]')
            .then(function (is) {
                if(is) {
                    return this.click('[data-control-name="view_profile"]')
                        .pause(2000)
                        .click('.contact-see-more-less')
                        .getText('.pv-top-card-section__name')
                        .then(function (el) {
                            name = el;
                            return this.getText('.pv-top-card-section__headline');
                        })
                        .then(function (el) {
                            title = el;
                            return this.getText('.ci-vanity-url .pv-contact-info__contact-item');
                        })
                        .then(function (el) {
                            url = el;
                            return this.isExisting('.ci-phone .pv-contact-info__contact-item').then(function (is) {
                                if(is) {
                                    return this.getText('.ci-phone .pv-contact-info__contact-item');
                                }
                            });
                        })
                        .then(function (el) {
                            phone = el;
                            return this.isExisting('.ci-email .pv-contact-info__contact-item').then(function (is) {
                                if(is) {
                                    return this.getText('.ci-email .pv-contact-info__contact-item');
                                }
                            });
                        })
                        .then(function (el) {
                            email = el;
                            return this.back();
                        })
                        .pause(3000)
                        .click('a[href*="' + thread + '"]')
                        .pause(2000)
                        // TODO: scroll to very top of thread
                        .elements('.msg-s-message-list > li')
                        .then(function (els) {
                            var result = this;
                            var contactInfo = [name, url, phone, email];
                            contact = contactInfo.filter(function (i) { return (i || '').trim() !== ''; }).join(' | ');
                            for (var e = 0; e < els.value.length; e++) {
                                (function (elem) {
                                    if(!elem) {
                                        return;
                                    }
                                    result = result.readLinkedInMessage(elem, contact, title, cb)
                                        .catch(function (e) { console.log(e); });
                                })(els.value[e]);
                            }
                            return result;
                        })
                        .catch(function (e) { console.log(e); });
                }
            })

    }

    function readLinkedInMessage(elem, contact, title, cb)
    {
        return this.elementIdElement(elem.ELEMENT, 'time')
            .then(function (el) {
                if(!el.value) {
                    return;
                }
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                if(!el) {
                    return;
                }
                var day = el.value, d, m, currDate, dayKey;
                if(day == 'Today') {
                    currDate = new Date();
                }
                else if ((d = dotw.indexOf(day.split(' ')[0])) > -1) {
                    currDate = (new Date());
                    var adjust = (7 - d);
                    if(adjust > (new Date()).getDay()) {
                        adjust += 7;
                    }
                    currDate.setDate((new Date()).getDate()-adjust);
                }
                else if ((m = months.indexOf(day.split(' ')[0])) > -1) {
                    currDate = new Date((m + 1) + '/' + day.split(' ')[1] + '/' + (new Date()).getFullYear());
                }
                else {
                    currDate = new Date(day);
                }
                day = (currDate.getMonth()+1) + '/' + currDate.getDate() + '/' + currDate.getFullYear();
                dayKey = currDate.getDate() + months[currDate.getMonth()] + (currDate.getFullYear() + '').substr(2, 2);
                return this.elementIdElements(elem.ELEMENT, 'ul')
                    .then(function (els) {
                        var result = this;
                        for (var e = 0; e < els.value.length; e++) {
                            (function (elem) {
                                result = result.readLinkedInMessageGroup(elem, day, dayKey, contact, title);
                            })(els.value[e]);
                        }
                        return result;
                    })
                    .then(function () {
                        cb({
                            type:'conversations',
                            conversations: dayKey,
                            clear:true
                        });
                        cb(linkedinCache[dayKey]);
                    })
                    .catch(function (e) { console.log(e); });
            })
            .catch(function (e) { console.log(e); });

    }

    function readLinkedInMessageGroup(elem, day, dayKey, contact, title)
    {
        return this.elementIdElement(elem.ELEMENT, 'time')
            .then(function (el) {
                if(!el.value) {
                    return;
                }
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                if(!el) {
                    return;
                }
                var time = el.value;
                return this.elementIdElements(elem.ELEMENT, 'li')
                    .then(function (els) {
                        if(!els) {
                            return;
                        }
                        var result = this;
                        for (var e = 0; e < els.value.length; e++) {
                            (function (elem) {
                                if(!elem) {
                                    return;
                                }
                                result = result.elementIdText(elem.ELEMENT)
                                    .then(function (el) {
                                        if(!el) {
                                            return;
                                        }
                                        var newRow = {
                                            type: 'conversations',
                                            conversations: dayKey,
                                            participants: contact,
                                            message: el.value,
                                            time: new Date(day + ' ' + time),
                                            title: title
                                        };
                                        if (typeof linkedinCache[newRow.conversations] == 'undefined') {
                                            linkedinCache[newRow.conversations] = [newRow];
                                        }
                                        else {
                                            linkedinCache[newRow.conversations] = linkedinCache[newRow.conversations]
                                                .filter(function (i) {
                                                    return i.message != newRow.message
                                                    || i.time != newRow.time
                                                    || i.participants != newRow.participants;
                                                })
                                                .concat([newRow]);
                                        }
                                    })
                                    .catch(function (e) { console.log(e); });
                            })(els.value[e]);
                        }
                        return result;
                    })
            })
            .catch(function (e) { console.log(e); });
    }

    function syncLinkedInChats(cb) {

        // TODO: load cached conversations
        linkedinCache = standard.loadCache('conversations', function (a, b) {
            return a.message != b.message || a.time != b.time || a.participants != b.participants;
        });
        for (var c in linkedinCache) {
            if (linkedinCache.hasOwnProperty(c)) {
                cb({
                    type: 'conversations',
                    conversations: c,
                    clear: true
                });
                cb(linkedinCache[c]);
            }
        }

        return this.getLinkedInChats(cb)
            .pause(1000)
            .endAll()
            .then(standard.saveCache(linkedinCache, 'conversations'))
            .then(function () {
                // TODO: save message cache
            });
    }

    commands.readLinkedInMessageGroup = readLinkedInMessageGroup;
    commands.readLinkedInMessage = readLinkedInMessage;
    commands.syncLinkedInChats = syncLinkedInChats;
    commands.readLinkedInThread = readLinkedInThread;
    commands.getLinkedInChats = getLinkedInChats;

    return commands;
};