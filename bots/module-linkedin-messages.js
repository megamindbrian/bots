const standard = require('./standard.js');

var commands = {}, linkedinCache = {};
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dotw = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

module.exports = function (getCredentials) {

    function getLinkedInChats(cb) {
        console.log('LinkedIn: Logging linkedin history');
        var contacts = [];
        return this
            .url('https://www.linkedin.com/')
            .loginLinkedIn()
            .waitUntil(function () {
                return this.getUrl().then(function(url) {
                    return url.indexOf('login') == -1;
                });
            }, 20000, '')
            .click('#nav-settings__dropdown-trigger')
            .pause(500)
            .element('.nav-settings__view-profile-link')
            .then(function (el) {
                console.log('LinkedIn: Getting current profile info');
                return this.readLinkedInProfileInfo(el.value, function (info) {
                    contacts[contacts.length] = info;
                });
            })
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
                        result = result.readLinkedInThread(threads[t], contacts, cb);
                        // TODO: archive thread
                    }
                    return result;
                });
            })
            .catch(function (e) { console.log(e); });
    }

    function readLinkedInThread(thread, contacts, cb) {
        var name;
        var participants = [];
        return this.click('a[href*="' + thread + '"]')
            .pause(1000)
            .click('[data-control-name="topcard"]')
            .pause(1000)
            .elements('[data-control-name="view_profile"]')
            .then(function (els) {
                var result = this;
                // get a list of user profiles involved in the conversation
                for(var e = 0; e < els.value.length; e++) {
                    result = result.readLinkedInProfileInfo(els.value[e], function (info) {
                        participants[participants.length] = info;
                    });
                }
                return result.back()
                    .pause(2000)
                    // scroll to very top of thread
                    .scrollLinkedInThread()
                    .elements('.msg-s-message-list > li')
                    .then(function (els) {
                        var result = this;
                        for (var e = 0; e < els.value.length; e++) {
                            (function (elem) {
                                if(!elem) {
                                    return;
                                }
                                result = result.readLinkedInMessage(elem, contacts.concat(participants), cb)
                                    .catch(function (e) { console.log(e); });
                            })(els.value[e]);
                        }
                        return result;
                    })
                    .catch(function (e) { console.log(e); });
            })
    }

    function scrollLinkedInThread(c) {
        var result = this;
        if(!c) {
            c = 1;
        }
        for(var i = 0; i < 5; i++) {
            result = result.scroll('.msg-thread', 0, 0)
                .pause(2000);
        }
        return result
            .scroll('.msg-thread', 0, 0)
            .isExisting('.msg-thread .loader')
            .then(function (is) {
                if(is && c < 20) {
                    return this.scrollLinkedInThread(c+1);
                }
            });
    }

    function readLinkedInProfileInfo(elem, cb) {
        var name, url, phone, email, title;
        return this.elementIdClick(elem.ELEMENT)
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
                    if (is) {
                        return this.getText('.ci-phone .pv-contact-info__contact-item');
                    }
                });
            })
            .then(function (el) {
                phone = el;
                return this.isExisting('.ci-email .pv-contact-info__contact-item').then(function (is) {
                    if (is) {
                        return this.getText('.ci-email .pv-contact-info__contact-item');
                    }
                });
            })
            .then(function (el) {
                email = el;
                return this.back();
            })
            .pause(3000)
            .then(function () {
                cb({
                    name: name,
                    url: url,
                    phone: phone,
                    email: email,
                    title: title
                });
            })
            .catch(function (e) { console.log(e); });
    }

    function readLinkedInMessage(elem, contact, cb)
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
                dayKey = currDate.getDate() + months[currDate.getMonth()] + (currDate.getFullYear() + '').substr(2);
                return this.elementIdElements(elem.ELEMENT, 'ul')
                    .then(function (els) {
                        var result = this;
                        for (var e = 0; e < els.value.length; e++) {
                            (function (elem) {
                                result = result.readLinkedInMessageGroup(elem, day, dayKey, contact);
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

    function readLinkedInMessageGroup(elem, day, dayKey, contact)
    {
        var time, name;
        return this.elementIdElement(elem.ELEMENT, 'time')
            .then(function (el) {
                if(!el.value) {
                    return;
                }
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                if(el) {
                    time = el.value;
                }
                return this.elementIdElement(elem.ELEMENT, 'img');
            })
            .then(function (el) {
                if(!el.value) {
                    return;
                }
                return this.elementIdAttribute(el.value.ELEMENT, 'title');
            })
            .then(function (el) {
                if(el) {
                    name = el.value;
                }
                else {
                    name = contact[0].name;
                }
                if(!time || !name) {
                    return;
                }
                // sort contacts with
                var contacts = standard.levSort(contact, name, function (a) { return a.name; });
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
                                            participants: contacts.map(function (c) {return c.name + ' | ' + c.title;}).join(' > '),
                                            contacts: contacts,
                                            message: el.value,
                                            time: new Date(day + ' ' + time),
                                            title: contacts[0].title
                                        };
                                        if (typeof linkedinCache[newRow.conversations] == 'undefined') {
                                            linkedinCache[newRow.conversations] = [newRow];
                                        }
                                        else {
                                            linkedinCache[newRow.conversations] = linkedinCache[newRow.conversations]
                                                .filter(function (i) {
                                                    return i.message != newRow.message
                                                    || i.time != newRow.time
                                                    || i.participants[0].name != newRow.participants[0].name;
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

        // load cached conversations
        linkedinCache = standard.loadCache('conversations', function (a, b) {
            return a.message != b.message || a.time != b.time || a.participants[0].name != b.participants[0].name;
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
            // save message cache
            .then(standard.saveCache(linkedinCache, 'conversations'))
            .then(function () {
                // TODO: save contacts cache
            });
    }

    commands.scrollLinkedInThread = scrollLinkedInThread;
    commands.readLinkedInProfileInfo = readLinkedInProfileInfo;
    commands.readLinkedInMessageGroup = readLinkedInMessageGroup;
    commands.readLinkedInMessage = readLinkedInMessage;
    commands.syncLinkedInChats = syncLinkedInChats;
    commands.readLinkedInThread = readLinkedInThread;
    commands.getLinkedInChats = getLinkedInChats;

    return commands;
};