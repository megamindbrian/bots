
var commands = {};

module.exports = function (getCredentials) {

    function syncProcesses(cb) {
        console.log('Processes: Syncing tabs');
        return this
            .getTabIds()
            .getCurrentTabId()
            .getUrl()
            .getTitle()
            .pause(2000)
            .endAll();
    }

    commands.syncProcesses = syncProcesses;

    return commands;
};
