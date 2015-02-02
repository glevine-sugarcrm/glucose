#!/usr/bin/env node

var Task, fs, spawn, util;

Task = require('../task');
fs = require('fs-extra');
spawn = require('child_process').spawn;
util = require('util');

function BuildTask() {
    BuildTask.super_.apply(this, arguments);
}

util.inherits(BuildTask, Task);

BuildTask.prototype.start = function(app) {
    var args, child, self, volume;

    self = this;

    volume = appRoot + '/volumes/' + app.id;
    fs.mkdirsSync(volume);

    args = [
        '-b', volume,
        '-f', app.get('flavor'),
        '-s', app.get('source'),
        '-v', app.get('version')
    ];
    child = spawn(appRoot + '/bin/build', args);

    child.on('close', function(code) {
        self.emit('end', app);
    });
};

module.exports = BuildTask;
