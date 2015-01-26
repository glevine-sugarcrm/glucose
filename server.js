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
server.pre(function (req, res, next) {
    if (!req.is('json')) {
        return next(new restify.NotAcceptableError('application/json is the only acceptable request type'));
    }

    return next();
});

server.post('/apps/', function (req, res, next) {
    res.send(req.params);
    return next();
});

server.listen(3000, function () {
    console.log('%s listening at %s', server.name, server.url);
});

module.exports = server;
