const crypto = require('crypto');
const fs = require('fs');

var passwordsPassword = '';
var passAdd = false;
var passUpdate = false;

for(var index in process.argv) {
    if(process.argv.hasOwnProperty(index)) {
        var val = process.argv[index];
        if(val.indexOf('--add-pass') > -1) {
            passAdd = val.substr(11);
        }
        if(val.indexOf('--update-pass') > -1) {
            passAdd = val.substr(14);
            passUpdate = true;
        }
        if(val.indexOf('--password') > -1) {
            passwordsPassword = val.substr(11);
        }
    }
}

function encrypt(text) {
    var cipher = crypto.createCipher('aes-256-ctr', passwordsPassword);
    var crypted = cipher.update(text, 'latin1', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher('aes-256-ctr', passwordsPassword);
    var dec = decipher.update(text, 'hex', 'latin1');
    dec += decipher.final('latin1');
    return dec;
}

function decryptSet(set) {
    var resultSet = {};
    for(var i in set) {
        if(set.hasOwnProperty(i)) {
            if(i == 'added' || i == 'host') {
                resultSet[i] = set[i];
                continue;
            }
            resultSet[i] = decrypt(set[i]);
        }
    }
    return resultSet;
}

module.exports = function getCredentials(name) {
    return decryptSet(passwords.filter(function (el) {
            return el.host == name;
        })[0] || {});
};

function encryptSet(set) {
    var resultSet = {};
    for(var i in set) {
        if(set.hasOwnProperty(i)) {
            if(i == 'added' || i == 'host') {
                resultSet[i] = set[i];
                continue;
            }
            resultSet[i] = encrypt(set[i]);
        }
    }
    return resultSet;
}

// load password from a file so it doesn't show up in process list
if(fs.existsSync(passwordsPassword)) {
    passwordsPassword = fs.readFileSync(passwordsPassword, 'latin1').trim();
}

// load existing passwords file
var passwords;
if(fs.existsSync('passwords.json')) {
    var file = fs.readFileSync('passwords.json', 'latin1');
    if(file.length > 0) {
        try {
            console.log('Passwords: Reading encrypted passwords file');
            //var uncompressed = zlib.gunzipSync(Buffer.from(decrypted, 'base64'));
            passwords = JSON.parse(file);
        }
        catch (e) {
            console.log(e);
            passwords = [];
        }
    }
    else {
        passwords = [];
    }
}
else {
    passwords = [];
}

// modify passwords file
if(passAdd) {
    var passwordAddJson;
    if(passAdd.substr(0, 1) == '{') {
        passwordAddJson = JSON.parse(passAdd);
    }
    else if(fs.existsSync(passAdd)) {
        var content = fs.readFileSync(passAdd);
        passwordAddJson = JSON.parse(content);
    }
    else {
        passwordAddJson = JSON.parse(Base64.decode(passAdd));
    }
    if(typeof passwordAddJson == 'object') {
        passwordAddJson.added = new Date();
        var encrypted = encryptSet(passwordAddJson);
        if(passUpdate && passwordAddJson.host) {
            passwords = passwords.filter(function (el) {
                return el.host != passwordAddJson.host;
            });
        }
        passwords[passwords.length] = encrypted;
        var passwordString = JSON.stringify(passwords, null, 4);
        //var compressed = zlib.gzipSync(passwordString).toString('base64');
        console.log('Passwords: Saving encrypted file');
        fs.writeFileSync('passwords-new.json', passwordString);
        fs.renameSync('passwords.json', 'passwords-backup.json');
        fs.renameSync('passwords-new.json', 'passwords.json');
        fs.unlinkSync('passwords-backup.json');
        if(fs.existsSync(passAdd)) {
            console.log('Passwords: Deleting input file: ' + passAdd);
            fs.unlinkSync(passAdd);
        }
    }
    process.exit();
}
