#!/usr/bin/env node

var restify, server;

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
mongoose.connect('tingodb:///' + __dirname + '/db');

// models
var AppModel = mongoose.model('Apps', mongoose.Schema({
    containers: [String],
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
    tasks: [String]
}));

// routes
server.get('/apps/', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(data) {
        res.send(data);
        next();
    }

    AppModel.find({}).exec().then(success, error);
});

server.post('/apps/', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(data) {
        res.send(data);
        next();
    }

    AppModel.create(req.params).then(success, error);
});

server.del('/apps/', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(data) {
        res.send(204);
        next();
    }

    AppModel.remove().exec().then(success, error);
});

server.get('/apps/:id', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(data) {
        if (!data) {
            next(new restify.ResourceNotFoundError('Could not find app ' + req.params.id));
        } else {
            res.send(data);
            next();
        }
    }

    AppModel.findById(req.params.id).exec().then(success, error);
});

server.del('/apps/:id', function(req, res, next) {
    function error(err) {
        next(err);
    }

    function success(data) {
        res.send(204);
        next();
    }

    AppModel.remove({_id: req.params.id}).exec().then(success, error);
});

server.listen(3000, function() {
    console.log('%s listening at %s', server.name, server.url);
});

module.exports = server;
