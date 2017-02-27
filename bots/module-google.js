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
                        .addValue('input[name="Passwd"]', credentials.Passwd)
                        .submitForm('#gaia_loginform')
                        .catch(function (e) {
                            console.log(e);
                            console.log('Google: Could not log in');
                        })
                }
            });
    }

    commands.loginGoogle = loginGoogle;

    return commands;
};