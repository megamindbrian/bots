
var commands = {};

module.exports = function (getCredentials) {

    function syncProcesses(cb) {
        console.log('Processes: Listing tabs');
        var url, tab, title;
        return this.getUrl()
            .then(function (u) {
                url = u;
                return this.getTitle();
            })
            .then(function (t) {
                title = t;
                return this.getCurrentTabId();
            })
            .then(function (current) {
                tab = current;
                return this.getTabIds();
            })
            .then(function (ids) {
                cb(ids.map(function (i) {
                    return {
                        type: 'processes',
                        id: i,
                        name: i == tab ? (title + ' | ' + url) : '<inactive>',
                        processes: 'Tabs'
                    };
                }));
                this.pause(2000)
                    .endAll();
            }, function (e) {
                console.log(e);
            })
    }

    commands.syncProcesses = syncProcesses;

    return commands;
};