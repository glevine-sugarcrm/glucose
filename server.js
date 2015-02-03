#!/usr/bin/env node

var path, restify, server;

path = require('path');
global.appRoot = path.resolve(__dirname);

restify = require('restify');

server = restify.createServer({
    name: 'glucose',
    version: '0.0.0'
});

server.use(restify.acceptParser('json'));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// only allow application/json
server.pre(function(req, res, next) {
    if (!req.is('json')) {
        next(new restify.NotAcceptableError('application/json is the only acceptable request type'));
    } else {
        next();
    }
});

// database
var mongoose, tungus;

tungus = require('tungus');
mongoose = require('mongoose');
mongoose.connect('tingodb:///' + appRoot + '/db');

// models
var AppModel;

AppModel = mongoose.model('Apps', mongoose.Schema({
    containers: [String], // docker containers that are used by the app
    flavor: {type: String, default: 'ent'}, // flavor of the app
    source: String, // location of the source code
    stack: {
        database: {
            name: String, // apache, oracle, db2
            version: String
        },
        operating_system: {
            name: String, // centos, ubuntu, windows
            version: String
        },
        php: String, // version number
        server: {
            name: String, // apache, nginx
            version: String
        }
    },
    status: String, // current task
    tasks: [String],
    version: {type: String, default: '7.7.0'}
}));

// tasks
var TaskQueue, RegisteredTasks;
TaskQueue = require('./task-queue');
RegisteredTasks = require('require-all')(appRoot + '/tasks');

// routes
server.get('/apps/', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(apps) {
        res.send(apps);
        next();
    }

    AppModel.find({}).exec().then(success, error);
});

server.post('/apps/', function(req, res, next) {
    var data = req.params;

    //TODO: error if no data.source

    function error(err) {
        next(err);
    }

    function success(app) {
        var queue, tasks;

        queue = new TaskQueue();
        app.get('tasks').forEach(function(task) {
            if (RegisteredTasks[task]) {
                queue.use(task, RegisteredTasks[task]);
            }
        });
        queue.process(app);

        res.send(app);
        next();
    }

    // must always start with building the app
    data.tasks || (data.tasks = []);
    data.tasks.unshift('build');

    AppModel.create(data).then(success, error);
});

server.del('/apps/', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success() {
        res.send(204);
        next();
    }

    AppModel.remove().exec().then(success, error);
});

server.get('/apps/:id', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(app) {
        if (!app) {
            next(new restify.ResourceNotFoundError('Could not find app ' + req.params.id));
        } else {
            res.send(app);
            next();
        }
    }

    AppModel.findById(req.params.id).exec().then(success, error);
});

server.del('/apps/:id', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(app) {
        res.send(204);
        next();
    }

    AppModel.remove({_id: req.params.id}).exec().then(success, error);
});

server.listen(3000, function() {
    console.log('%s listening at %s', server.name, server.url);
});

module.exports = server;
