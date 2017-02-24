$(document).ready(function () {

    var body = $('body');
    var ids = body.find('aside a').map(function () { return $(this).attr('href').substr(1); }).toArray().join(' ');

    body.on('click', 'aside a', function () {
        var id = $(this).attr('href');
        if(!body.find('> .active').is(id)) {
            body.find('> .active').removeClass('active');
            body.removeClass(ids).find(id).addClass('active');
            body.addClass(id.substr(1));
        }
    });

    if(window.location.hash != '#') {
        body.find('a[href="' + window.location.hash + '"]').trigger('click');
    }

    var socket = io.connect(window.location.host);

    body.on('click', 'header button', function () {
        socket.emit('sync', body.find('div:visible').data('sync'));
    });

    function processObj(data)
    {
        if(data && typeof data.type != 'undefined') {
            var className = data.type + '-' + (data[data.type] || '').toLowerCase();
            var container = $('#' + data.type);
            var fields = container.find('table thead th').map(function () { return $(this).text().toLowerCase(); }).toArray();
            var row = [];
            for(var i in data) {
                if(data.hasOwnProperty(i)) {
                    row[fields.indexOf(i)] = data[i];
                }
            }
            var title = container.find('h2.' + className);
            if(title.length == 0) {
                var newSection = $('<h2>' + data.type + '</h2><table><tbody></tbody></table>').addClass(className);
                container.find('table head').first().clone().prependTo(newSection.find('table'));
                container.append(newSection);
            }
            $('<tr><td>' + row.join('</td><td>') + '</td></tr>').appendTo(title.next('table').find('tbody'));
        }
    }

    socket.on('data', function (data) {
        if(data.constructor === Array) {
            for(var d = 0; d < data.length; d++) {
                processObj(data[d]);
            }
        }
        else {
            processObj(data);
        }
    });

    socket.on('clear', function (data) {
        var container = $('#' + data.type);
        var className = data.type + '-' + (data[data.type] || '').toLowerCase();
        var title = container.find('h2.' + className);
        title.next('table').find('tbody tr').remove();
    });
});