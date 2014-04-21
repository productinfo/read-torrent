var request = require('request');
var fs = require('fs');
var zlib = require('zlib');
var parseTorrent = require('parse-torrent');
var magnet = require('magnet-uri');

module.exports = function readTorrent (url, callback) {
	// Ensure true async callback, no matter what.
	var asyncCallback = function(err, data) {
		process.nextTick(function() { callback(err, data); });
	};

	var onData = function (err, data) {
		if (err) return asyncCallback(err);
		try { 
			data = parseTorrent(data); 
		} catch (e) { 
			return asyncCallback(e);
		}
		asyncCallback(null, data);
	};

	var onResponse = function (err, response) {
		if (err) return asyncCallback(err);
		if (response.statusCode >= 400) return asyncCallback(new Error('Bad Response: '+response.statusCode));
		if (response.headers['content-encoding'] === 'gzip') return zlib.gunzip(response.body, onData);
		onData(null, response.body);
	};

	if (Buffer.isBuffer(url)) return onData(null, url);
	if (/^https?:/.test(url)) return request(url, {encoding:null}, onResponse);
	if (/^magnet:/.test(url)) {
		try { var result = magnet(url); } catch(e) { return asyncCallback(e) }
		if (!!result && result != {}) return asyncCallback(null, result)
		return asyncCallback(new Error('Malformed Magnet URI'));
	}
	fs.readFile(url, onData);
};
