#!/usr/bin/env node

var events, util;

events = require('events');
util = require('util');

function Task() {
    Task.super_.call(this);
}

util.inherits(Task, events.EventEmitter);

Task.prototype.start = function(app) {
};

module.exports = Task;
