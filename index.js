var tessel = require('tessel');
var wifi   = require('wifi-cc3000');
var gprs   = require('gprs-sim900').use(tessel.port.A);
var gps    = require('gps-a2235h').use(tessel.port.C);

var leds     = require('./lib/leds');
var chain    = require('./lib/chain');
var commands = require('./lib/commands')(gprs);

var coords = null;

if (wifi.isEnabled()) {
	wifi.disable();
}

gprs.on('ready', function() {
	leds.green.on();
	leds.red.off();
	leds.blue.off();
	var initialize = chain(commands)
		.retry(commands.checkGprsState, 10, 2000)
		.setBearerSetting('CONTYPE', 'GPRS')
		.setBearerSetting('APN', env.process.APN);
		.openBearer()
		.initializeHttpService()
		.setHttpParameter('URL', 'https://aqueous-fortress-6655.herokuapp.com/events')
		.setHttpParameter('CONTENT', 'application/json')
		.setHttpParameter('TIMEOUT', '30')
		.end(function(err) {
			if (err && err.length > 1) {
				console.log('error: ', error);
				return reset();
			}
			console.log('about to post');
			post();
		});
	var reset = function() {
		leds.off();
		leds.red.on();
		commands.restart(function() {
			leds.red.off();
			initialize();
		});
	};
	var post = function() {
		console.log('coordinates: ', coords);
		if(!coords){
			console.log('still waiting on coordinates');
			coords = {
				timestamp : 4454.037,
				 lat : 37.765246666667,
				 lon : -122.39916833333,
				 numSat : 0,
				 speed : 0.88
			}
		}
		if (coords) {
			var content = coords;
			coords = null;
			leds.blue.on();
			return commands.sendPostRequest(content, function(err) {
				if (err) {
					leds.red.blink(300);
					return console.log('Error with post: ', err);
				}
				leds.blue.off();
				console.log('completed post request with content: ', content);
				// setTimeout(post, 500);
			});
		}
		leds.blue.blink(50, 2);
		setTimeout(post, 2000);
	};
	initialize();
});

gps.on('ready', function() {
	gps.on('coordinates', function(data) {
		coords = data;
	});
	gps.on('fix', function(data) {
		if (data.numSat <= 1) {
			leds.green.blink(50);
		} else if (data.numSat <= 6) {
			leds.green.blink(200);
		} else {
			leds.green.blink(200, 2);
		}
		coords.numSat = data.numSat;
	});
});
