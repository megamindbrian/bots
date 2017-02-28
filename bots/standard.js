const fs = require('fs');
const path = require( 'path' );


module.exports = {

    loadCache: function (name, compare) {
        var result = {};
        if (fs.existsSync('/data/' + name)) {
            console.log('Daemon: Loading cache ' + '/data/' + name);
            var files = fs.readdirSync('/data/' + name);
            files.forEach(function (file) {
                // Make one pass and make the file complete
                if (!file.match(new RegExp(name + '-.*\.cache\.json', 'ig'))) {
                    return;
                }
                var fromPath = path.join('/data/' + name, file);
                var events = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
                for (var e = 0; e < events.length; e++) {
                    if (typeof result[events[e][name]] == 'undefined') {
                        result[events[e][name]] = [events[e]];
                    }
                    else {
                        result[events[e][name]] = result[events[e][name]]
                            .filter(function (i) { return compare(i, events[e]) })
                            .concat([events[e]]);
                    }
                }
            });
            return result;
        }
    },

    saveCache: function (cache, name) {
        // keep a cache of locations
        return function () {
            if (fs.existsSync('/data/' + name)) {
                console.log('Daemon: Saving cache ' + '/data/' + name);
                for (var e in cache) {
                    if (cache.hasOwnProperty(e)) {
                        var toPath = path.join('/data/' + name, name + '-' + e + '.cache.json');
                        fs.writeFileSync(toPath, JSON.stringify(cache[e], null, 2), 'utf8');
                    }
                }
            }
        };
    }

};