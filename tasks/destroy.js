#!/usr/bin/env node

var fs = require('fs-extra');

function destroy(app, next) {
    fs.remove(appRoot + '/volumes/' + app.id, function (err) {
        next(err);
    });
}

module.exports = destroy;
