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

    if (!app) {
        done(new Error('Cannot run tasks if there is no app on which to run them'));
        return;
    }

    names = keys(this.tasks);

    if (names.length > 0) {
        next();
    } else {
        done();
    }

    function next(err) {
        var func, name, n;

        if (err) {
            done(err);
            return;
        }

        name = names.splice(0, 1);
        func = self.tasks[name];

        if (names.length > 0) {
            n = next;
        } else {
            n = done;
        }

        if (!app.isDeleted) {
            app.set({status: name});
            app.save(function(err, app) {
                if (err) {
                    n(err);
                } else {
                    func.call(self, app, n);
                }
            });
        } else {
            func.call(self, app, n);
        }
    }

    function done(err) {
        if (err) {
            self.emit('error', err);
            return;
        }

        if (!app.isDeleted) {
            app.set({status: 'idle'});
            app.save(function(err, app) {
                if (err) {
                    self.emit('error', err);
                } else {
                    self.emit('end');
                }
            });
        } else {
            self.emit('end');
        }
    }
};

module.exports = exports = TaskQueue;
