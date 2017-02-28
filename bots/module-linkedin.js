
var commands = {};

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

    function respondLinkedInConnections(cb) {
        //https://www.linkedin.com/mynetwork/invite-connect/connections/
    }

    commands.respondLinkedInConnections = respondLinkedInConnections;
    commands.loginLinkedIn = loginLinkedIn;

    return commands;
};
