const fs = require('fs');
const path = require( 'path' );

function loadCache(name, compare) {
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
}

function saveCache(cache, name) {
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

function levDist(s, t) {
    var d = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (var i = n; i >= 0; i--) d[i][0] = i;
    for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (var i = 1; i <= n; i++) {
        var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }

    // Step 7
    return d[n][m];
}

function levSort(arr, search, getStr) {
    var result = arr.map(function (a) {return a;});
    result.sort(function(a, b){
        return levDist(getStr(a), search) - levDist(getStr(b), search);
    });
    return result;
}

module.exports = {

    loadCache: loadCache,
    saveCache: saveCache,
    levDist: levDist,
    levSort: levSort



};