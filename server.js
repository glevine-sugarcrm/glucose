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

// tasks
var TaskQueue, allowedTasks;

TaskQueue = require('./task-queue');
allowedTasks = require('require-all')(appRoot + '/tasks');

// database
var mongoose, tungus;

tungus = require('tungus');
mongoose = require('mongoose');
mongoose.connect('tingodb:///' + appRoot + '/db');

// models
var AppModel, AppModelSchema;

AppModelSchema = mongoose.Schema({
    flavor: {type: String, default: 'ent'}, // flavor of the app
    machines: [String], // docker containers that are used by the app
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
});

/**
 * Keep track of whether or not this model is new, for use in post-save
 * middleware.
 */
AppModelSchema.pre('save', function(next) {
    this.wasNew = this.isNew;

    next();
});

/**
 * Along with always building the app on create, set the status accordingly.
 */
AppModelSchema.pre('save', function(next) {
    if (this.isNew) {
        this.set('status', 'build');
    }

    next();
});

/**
 * Do not allow the build task to run again on create.
 */
AppModelSchema.pre('save', function(next) {
    var tasks;

    if (this.isNew) {
        tasks = (this.get('tasks') || []).filter(function(task) {
            return task !== 'build';
        });
        this.set('tasks', tasks);
    }

    next();
});

/**
 * Do not allow the destroy task to run unless an app is being removed.
 */
AppModelSchema.pre('save', function(next) {
    var tasks;

    tasks = (this.get('tasks') || []).filter(function(task) {
        return task !== 'destroy';
    });
    this.set('tasks', tasks);

    next();
});

/**
 * Filter out any tasks that are unknown.
 */
AppModelSchema.pre('save', function(next) {
    var tasks;

    tasks = (this.get('tasks') || []).filter(function(task) {
        return allowedTasks[task];
    });
    this.set('tasks', tasks);

    next();
});

/**
 * Only idle apps can be removed.
 */
AppModelSchema.pre('remove', function(next) {
    if (this.get('status') === 'idle') {
        next();
    } else {
        next(new Error('Only idle apps can be removed'));
    }
});

/**
 * Must always start with building the app.
 */
AppModelSchema.post('save', function() {
    var self = this;

    if (!this.wasNew) {
        return;
    }

    function run(err) {
        var q = new TaskQueue();

        self.get('tasks').forEach(function(task) {
            q.use(task, allowedTasks[task]);
        });
        q.process(self);
    }

    allowedTasks['build'].call(this, this, run);
});

/**
 * Run the destroy task when removing an app.
 */
AppModelSchema.post('remove', function() {
    allowedTasks['destroy'].call(this, this, function(err) {
        // symbolic callback
    });
});

AppModel = mongoose.model('Apps', AppModelSchema);

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
    function error(err) {
        next(err);
    }

    function success(app) {
        res.send(app);
        next();
    }

    if (!req.params.source) {
        error(new restify.MissingParameter('Missing parameter: source'));
        return;
    }

    AppModel.create(req.params).then(success, error);
});

server.del('/apps/', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success() {
        res.send(204);
        next();
    }

    AppModel.find({status: 'idle'})
        .stream()
        .on('error', error)
        .on('data', function(app) {
            app.remove();
        })
        .on('close', success);
});

server.get('/apps/:id', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(app) {
        if (!app) {
            error(new restify.ResourceNotFoundError('Could not find app ' + req.params.id));
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

    function success() {
        res.send(204);
        next();
    }

    function remove(err, app) {
        if (err) {
            error(err);
        } else if (!app) {
            error(new restify.ResourceNotFoundError('Could not find app ' + req.params.id));
        } else {
            app.remove(function(err) {
                if (err) {
                    error(err);
                } else {
                    success();
                }
            });
        }
    }

    AppModel.findById(req.params.id, remove);
});

server.listen(3000, function() {
    console.log('%s listening at %s', server.name, server.url);
});

module.exports = server;
