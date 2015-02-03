#!/usr/bin/env node

var EventEmitter, keys, util;

EventEmitter = require('events').EventEmitter;
util = require('util');
keys = require('lodash/object/keys');

function TaskQueue() {
    TaskQueue.super_.call(this);
    this.tasks = {};
}

util.inherits(TaskQueue, EventEmitter);

TaskQueue.prototype.use = function(name, func) {
    this.tasks[name] = func;
};

TaskQueue.prototype.process = function(app) {
    var names, self;

    self = this;
    names = keys(this.tasks);

    next();

    function next(err) {
        var func, name, n;

        if (err) {
            //TODO: log the error
            done();
            return;
        }

        name = names.splice(0, 1);
        func = self.tasks[name];

        if (names.length > 0) {
            n = next;
        } else {
            n = done;
        }

        app.set({status: name});
        app.save(function(err, app) {
            if (err) {
                n(err);
            } else {
                func.call(self, app, n);
            }
        });
    }

    function done() {
        self.emit('end');
    }
};

module.exports = TaskQueue;
