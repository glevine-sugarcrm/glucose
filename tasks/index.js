#!/usr/bin/env node

var build;

build = require('./build');

function transition(app) {
    var callback, status, task, tasks;

    tasks = app.get('tasks').slice();
    task = tasks.slice(tasks.indexOf(app.get('status')) + 1).shift();

    switch (task) {
        case 'build':
            callback = build;
            break;
        default:
            task = 'idle';
            callback = function() {};
    }

    _transition(app, task, callback);
}

function _transition(app, task, cb) {
    app.set({status: task});
    app.save(function(err, app) {
        if (err) {
            //TODO: log the error
        } else {
            cb(app);
        }
    });
}

module.exports = {};
module.exports.transition = transition;
