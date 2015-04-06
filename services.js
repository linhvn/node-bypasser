var Service = require('./service.js');
var common = require('./common.js');
var request = require('request');

var services = [];

var s = new Service("Adf.ly");
s.hosts = ['adf.ly'];
s.run = function(url, callback) {
	request(url, function(error, response, body) {
		if (error || response.statusCode != 200) {
			callback('Errore while fetching the given URL. Response code: ' + response.statusCode);
			return;
		}
		
		var match = body.match(/var ysmm = '(.*?)';/);
		if (match) {
			var ysmm = match[1];
			var i = ysmm.indexOf('!HiTommy');
			if (i > -1) {
				ysmm = ysmm.substring(0, i);
			}
			
			// Decrypt `ysmm`
			var z = f = '';

			for (var l = 0; l < ysmm.length; l++) { 
				if (l % 2 == 0) { 
					f += ysmm.charAt(l); 
				}
				else { 
					z = ysmm.charAt(l) + z; 
				} 
			}

			ysmm = f + z; 
			ysmm = new Buffer(ysmm, 'base64').toString('ascii'); 
			ysmm = ysmm.substring(2);
			
			callback(null, ysmm);
		}
		else {
			callback('The URL cannot be decrypted');
			return;
		}
	});
};
services.push(s);

var s = new Service("Linkbucks");
s.hosts = ['linkbucks.com'];
s.run = function(url, callback) {
	request(url, function(error, response, body) {
		if (error || response.statusCode != 200) {
			callback('Errore while fetching the given URL. Response code: ' + response.statusCode);
			return;
		}
		
		var lines = body.match(/[^\r\n]+/g);
		var startLine = -1;
		var endLine = -1;
		var found = false;
		
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (line.trim().startsWith('(function() {')) {
				startLine = i;
				continue;
			}
			if (line.trim().startsWith('})();')) {
				if (found) {
					// Found the right function block; exit
					endLine = i;
					break;
				}
				else {
					// Restart search...
					startLine = -1;
					continue;
				}
			}
			if (startLine == -1) {
				continue;
			}
			
			if (line.trim().startsWith('var f = window[\'init\' + \'Lb\' + \'js\' + \'\'];')) {
				found = true;
			}
			
			
		}
		
		if (startLine == -1 || endLine == -1) {
			callback('The URL cannot be decrypted');
			return;
		}
		
		var block = lines.slice(startLine, endLine);
		var found = 0;
		for (var i = 0; i < block.length && found < 3; i++) {
			var line = block[i];
			
			// Find token
			if (line.trim().startsWith('Token')) {
				var token = line.match(/Token: '([a-z0-9]+)',/)[1];
				found = 1;
				continue;
			}
			
			// Find auth key
			if (found == 1 && line.trim().startsWith('params')) {
				var authKey = +line.match(/ = (\d+)/)[1];
				found = 2;
				continue;
			}
			
			// Find auth key salt
			if (found == 2 && line.trim().startsWith('params')) {
				var salt = +line.match(/ \+ (\d+);/)[1];
				authKey += salt;
				found = 3;
				continue;
			}
		}
		
		var url = 'http://www.linkbucks.com/intermission/loadTargetUrl?t=' + token + '&aK=' + authKey;
		
		setTimeout(function() {
			request(url, function(error, response, body) {
				if (error || response.statusCode != 200) {
					callback('The URL cannot be decrypted. Response code: ' + response.statusCode);
					return;
				}
				
				var response = JSON.parse(body);
				if (response['Success'] == true && !response['AdBlockSpotted'] && response['Url']) {
					callback(null, response['Url']);
				}
				else {
					callback('The URL cannot be decrypted: ' + body);
				}
			});
		}, 5000);
		
	});
};
services.push(s);

var s = new Service("Shorte.st");
s.hosts = ['sh.st'];
s.run = function(url, callback) {
	var referer = url;
	request(url, function(error, response, body) {
		if (error || response.statusCode != 200) {
			callback('Errore while fetching the given URL. Response code: ' + response.statusCode);
			return;
		}
		
		var match = body.match(/sessionId: "([a-z0-9]+)",/i);
		if (!match) {
			callback('The URL cannot be decrypted');
			return;
		}
		
		var token = match[1];
		var now = Math.round(Date.now() / 1000);
		var url = 'http://sh.st/adSession/callback?sessionId=' + token + '&browserToken=' + now + '&callback=reqwest_' + now;
		
		var options = {
			uri: url,
			headers: {
				'Referer': referer
			}
		};
				
		setTimeout(function() {
			request(options, function(error, response, body) {
				if (error || response.statusCode != 200) {
					callback('The URL cannot be decrypted. Response code: ' + response.statusCode);
					return;
				}
				
				var match = body.match(/url":"(.*?)"/i);
				if (match && match[1]) {
					var res = match[1].replace(/\\\//g, '/');
					callback(null, res);
				}
				else {
					callback('The URL cannot be decrypted: ' + body);
				}
			});
		}, 5000);
		
		
	});
};
services.push(s);


// TODO adfoc.us
// TODO bit.ly
// TODO goo.gl

module.exports = services;
