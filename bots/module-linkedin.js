
var commands = {};

module.exports = function (getCredentials) {

    function loginLinkedIn() {
        return this.isExisting('legend*=Sign in')
            .then(function (is) {
                if (is) {
                    console.log('LinkedIn: Sign in required');
                    var credentials = getCredentials('linkedin.com');
                    return this
                        .waitForVisible('input[name="session_key"]')
                        .addValue('input[name="session_key"]', credentials.session_key)
                        .waitForVisible('input[name="session_password"]', 5000)
                        .then(function () {
                            console.log('LinkedIn: Require password');
                        })
                        .catch(function () {
                            console.log('LinkedIn: Could not log in');
                        })
                        .addValue('input[name="session_password"]', credentials.session_password)
                        .submitForm('#btn-primary');
                }
            });
    }

    function getLinkedInChats() {
        console.log('LinkedIn: Logging linkedin history');
        return this
            .url('https://www.linkedin.com/uas/login')
            .loginLinkedIn()
            .waitUntil(function () {
                return this.getUrl().then(function(url) {
                    return url.indexOf('login') == -1;
                });
            }, 20000, '')
            .catch(function (e) {
                console.log(e);
                console.log('LinkedIn: Cannot reach messaging');
            })
            .pause(10000)
            .endAll();
    }

    commands.loginLinkedIn = loginLinkedIn;
    commands.getLinkedInChats = getLinkedInChats;

    return commands;
};
