"use strict";

var path = require("path");
var cp = require("child_process");

var phantomjsCmd = path.resolve(__dirname, "../node_modules/phantomjs/bin/phantomjs");
var converterFileName = path.resolve(__dirname, "./converter.js");

module.exports = function svg2pngdata(sourceFileName, destFileName, scale, cb) {
    if (typeof scale === "function") {
        cb = scale;
        scale = 1.0;
    }
    var cmd = "phantomjs " + converterFileName + " " + sourceFileName + " " + destFileName + " " + scale;
    cp.exec(cmd, function (err, stdout, stderr) {
        if (err) {
            cb(err);
        } else if (stdout.length > 0) { // PhantomJS always outputs to stdout.
            cb(stdout.toString().trim());
        } else if (stderr.length > 0) { // But hey something else might get to stderr.
            cb(new Error(stderr.toString().trim()));
        } else {
            cb(null);
        }
    });
};
