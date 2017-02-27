
var commands = {}, linkedinCache = {};
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dotw = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

module.exports = function (getCredentials) {

    function loginLinkedIn() {
        var client = this;
        return this
            .pause(1000)
            .isExisting('*=Forgot password?')
            .then(function (is) {
                if (is) {
                    console.log('LinkedIn: Sign in required');
                    var credentials = getCredentials('linkedin.com');
                    return client
                        .click('input[name="session_key"]')
                        //.waitForVisible('input[name="session_key"]', 3000)
                        .keys(credentials.session_key)
                        //.waitForVisible('input[name="session_password"]', 5000)
                        .then(function () {
                            console.log('LinkedIn: Require password');
                        })
                        .click('input[name="session_password"]')
                        .keys(credentials.session_password)
                        .submitForm('.login-form')
                        .catch(function (e) {
                            console.log(e);
                            console.log('LinkedIn: Could not log in');
                        })
                }
            })
            .catch(function (e) {
                console.log(e);
            });
    }

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
                    }
                    return result;
                });
            })
            .catch(function (e) {
                console.log(e);
            });
    }

    function readLinkedInThread(thread, cb) {
        var contact = '';
        return this.click('a[href*="' + thread + '"]')
            .pause(1000)
            .click('[data-control-name="topcard"]')
            .pause(1000)
            .click('[data-control-name="view_profile"]')
            .pause(2000)
            .element('.pv-contact-info')
            .then(function (el) {
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                contact = el.value;
                console.log(contact);
                return this.back();
            })
            .pause(1000)
            .click('a[href*="' + thread + '"]')
            .pause(2000)
            // TODO: scroll to very top of thread
            .elements('.msg-s-message-list > li')
            .then(function (els) {
                var result = this;
                for (var e = 0; e < els.value.length; e++) {
                    (function (elem) {
                        if(!elem) {
                            return;
                        }
                        result = result.readLinkedInMessage(elem, contact, cb);
                    })(els.value[e]);
                }
                return result;
            })

    }

    function readLinkedInMessage(elem, contact, cb)
    {
        return this.elementIdElement(elem.ELEMENT, 'time')
            .then(function (el) {
                if(!el.value) {
                    return this;
                }
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                if(!el.value) {
                    return this;
                }
                var day = el.value, d, m, currDate, dayKey;
                if(day == 'today') {
                    currDate = new Date();
                }
                else if ((d = dotw.indexOf(day.split(' ')[0])) > -1) {
                    currDate = (new Date());
                    currDate.setDate((new Date()).getDate()-(7 - d));
                }
                else if ((m = months.indexOf(day.split(' ')[0])) > -1) {
                    currDate = new Date((m + 1) + '/' + day.split(' ')[1] + (new Date()).getFullYear());
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
            })


    }

    function readLinkedInMessageGroup(elem, day, dayKey, contact)
    {
        return this.elementIdElement(elem.ELEMENT, 'time')
            .then(function (el) {
                return this.elementIdText(el.value.ELEMENT);
            })
            .then(function (el) {
                if(!el.value) {
                    return this;
                }
                var time = el.value;
                return this.elementIdElements(elem.ELEMENT, 'li')
                    .then(function (els) {
                        var result = this;
                        for (var e = 0; e < els.value.length; e++) {
                            (function (elem) {
                                if(!elem) {
                                    return;
                                }
                                result = result.elementIdText(elem.ELEMENT)
                                    .then(function (el) {
                                        var newRow = {
                                            type: 'conversations',
                                            conversations: dayKey,
                                            participants: contact,
                                            message: el.value,
                                            time: new Date(day + ' ' + time)
                                        };
                                        if (typeof linkedinCache[newRow.conversations] == 'undefined') {
                                            linkedinCache[newRow.conversations] = [newRow];
                                        }
                                        else {
                                            linkedinCache[newRow.conversations] = linkedinCache[newRow.conversations]
                                                .filter(function (i) {
                                                    return !(i.time == newRow.time && i.participants == newRow.participants);
                                                })
                                                .concat([newRow]);
                                        }
                                        return this;
                                    });
                            })(els.value[e]);
                        }
                        return result;
                    })
            })

    }

    function respondLinkedInConnections(cb) {
        //https://www.linkedin.com/mynetwork/invite-connect/connections/
    }

    function syncLinkedInChats(cb) {

        // TODO: load cached conversations

        return this.getLinkedInChats(cb)
            .pause(1000)
            //.endAll()
            .then(function () {
                // TODO: save cache
            });
    }

    commands.respondLinkedInConnections = respondLinkedInConnections;
    commands.readLinkedInMessageGroup = readLinkedInMessageGroup;
    commands.readLinkedInMessage = readLinkedInMessage;
    commands.syncLinkedInChats = syncLinkedInChats;
    commands.readLinkedInThread = readLinkedInThread;
    commands.loginLinkedIn = loginLinkedIn;
    commands.getLinkedInChats = getLinkedInChats;

    return commands;
};
