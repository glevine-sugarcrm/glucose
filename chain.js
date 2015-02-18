#!/usr/bin/env node

var Q = require('q');

function chain(names, funcs, app) {
    var next;

    function updateStatus(app, status) {
        var deferred = Q.defer();

        app.set({status: status});
        app.save(function(err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(app);
            }
        });

        return deferred.promise;
    }

    // var result = Q(initialValue)
    // initialValue should be a function that shifts the next status off names and resolves with app, next

    // in a while loop, result.then(updateStatus).then(callFunction)
    // callFunction should be a function that shifts the next status off names and next func of funcs and calls func
    // the task (func) will take app and return a promise
    // when the task promise resolves, then we can resolve here to call the next updateStatus

    // this enables next to be updated at the right moment in time
    //TODO: trace through this logic

    var result = Q(function() {
        var deferred, first;

        deferred = Q.defer();
        first = names.shift();
        deferred.resolve(app, first);

        return deferred.promise;
    });

    while (names.length > 0) {
        result.then(updateStatus).then(function(app) {
            var deferred, func;

            deferred = Q.defer();
            func = funcs.shift();
            next = names.shift();

            var promise = func(app);
            Q.when(promise, resolveWithAppAndNext, rejectWithError);

            return deferred.promise;
        });
    }
}

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
