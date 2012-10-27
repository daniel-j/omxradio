'use strict';

process.stdout.write("Loading modules: http");var http = require('http');
process.stdout.write(", url");var url  = require('url');
process.stdout.write(", path");var path = require('path');
process.stdout.write(", fs");var fs   = require('fs');
process.stdout.write(", mime");var mime = require('mime');
process.stdout.write(", os");var os   = require('os');
process.stdout.write(", zlib");var zlib = require('zlib');
process.stdout.write(", omxcontrol");var omx = require('omxcontrol');
process.stdout.write(", youtube-feeds");var youtube = require('youtube-feeds');
process.stdout.write(", child_process");var child_process = require('child_process');
process.stdout.write(", DONE!\n");

var PORT = 7000;

var nowPlaying = "";
var requests  = [];
var responses = [];
var reqTimers = [];

var sseReq  = [];
var sseRes  = [];
var sseId   = [];

var sseData = {};

omx.onstop = function () {
	setNowPlaying("");
	console.log("omxplayer stopped");
};

function setNowPlaying(np) {
	if (nowPlaying !== np) {
		nowPlaying = np;
		sseData.nowPlaying = np;
		updateNowPlaying();
	}
}
function updateNowPlaying() {
	
	for (var i=0; i < requests.length; i++) {
		responses[i].end(nowPlaying);
		clearTimeout(reqTimers[i]);
	}

	for (var i=0; i < sseReq.length; i++) {
		sseRes[i].write("id: "+sseId[i]+"\n");
		sseRes[i].write("data: "+JSON.stringify(sseData)+"\n\n");
	}

	requests = [];
	responses = [];
	reqTimers = [];
}

var httpServer = http.createServer(function (req, res) {
	
	var uri = url.parse(req.url, true);
	
	var pathname = decodeURI(uri.pathname.replace(/\/\//g, "/"));
	var pathlist = pathname.substr(1).split("/");

	var specialCommand = true;
	
	switch (pathlist[0]) {

		case 'omx':

			switch (pathlist[1]) {
				case 'start':
					//console.log(uri.query.path);
					omx.start(uri.query.path, function () {
						setNowPlaying('<a href="'+uri.query.path+'" target="_blank">'+(uri.query.title || uri.query.path)+'</a>');
						res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
						res.end();
					});
					
					break;
				case 'stop':
					console.log('stop');
					omx.stop(function () {
						setNowPlaying("");
						res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
						res.end();
					});
					break;

				case 'backward':
					console.log('backward');
					omx.backward();
					res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
					res.end();
					break;
				case 'forward':
					console.log('forward');
					omx.forward();
					res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
					res.end();
					break;
				case 'playpause':
					console.log('playpause');
					omx.pause();
					res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
					res.end();
					break;

				default:
					notFound(res);
				break;
			}

			

			break;

		case 'youtube':
			switch (pathlist[1]) {
				case 'search':
					console.log("Youtube search:", uri.query.q);
					youtube.feeds.videos( {q: uri.query.q}, function (result) {
						if (result.items && result.items[0]) {
							var video = result.items[0];

							var title = video.title;
							var pageUrl = video.player.default;
							console.log("Playing:", title);

							var yt = child_process.spawn("youtube-dl", ["--format", "38/37/46/22/35/34/18/6/5/17/13", "-g", pageUrl]);
							var url = "";
							yt.stdout.on('data', function (data) {
								url += data.toString('utf8');
							});
							yt.stdout.on('close', function () {
								yt.kill();
								omx.start(unescape(url).trim(), function () {
									setNowPlaying('<a href="'+pageUrl+'" target="_blank">'+title+'</a>');
									res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
									res.end();
								});
							});
						} else { // No result
							res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
							res.end();
						}

					});
					break;
			}
			break;

		case 'events':
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			});
			var id = (new Date()).toLocaleTimeString();

			sseReq.push(req);
			sseRes.push(res);
			sseId.push(id);

			console.log('adding SSE client');

			req.on('close', function () {
				var index = sseReq.indexOf(req);
				if (index !== -1) {
					sseReq.splice(index, 1);
					sseRes.splice(index, 1);
					sseId.splice(index, 1);
					console.log('removing SSE client');
				}
			});

			break;

		case 'nowplaying':
			res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
			if (uri.query.init !== undefined || uri.query.current !== nowPlaying) {
				res.end(nowPlaying);
			} else {
				requests.push(req);
				responses.push(res);
				reqTimers.push(setTimeout(function () {
					res.end(nowPlaying);
				}, 30*1000));

				req.on('close', function () {
					var index = requests.indexOf(req);
					if (index !== -1) {
						clearTimeout(reqTimers[index]);
						requests.splice(index, 1);
						responses.splice(index, 1);
						reqTimers.splice(index, 1);

					}
				});
			}
			break;

		default:
			specialCommand = false;
			break;

	}
	if (specialCommand) {
		return;
	}

	
	httpGetFile(pathname, req, res);
});
httpServer.listen(PORT, function () {
	console.log("OMX radio on port "+PORT);
});

function getRelativePath(filepath) {
	return path.join(__dirname, filepath)
}

function notFound(res) {
	res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
	res.end('404 Not found');
}

function getServerInfo () {
	return "Raspberry Pi - "+os.type()+" "+os.release()+" "+os.arch().toUpperCase()+" - Node.JS "+process.version+", "+Math.floor(process.memoryUsage().rss/1024/1024)+" MB RAM used - "+Math.floor(os.uptime()/(60*60*24))+" day(s) device uptime";
}

function httpGetFile(reqpath, req, res, skipCache) {

	var pathname = reqpath;

	if (reqpath.substr(-1) === "/") {
		pathname += "index.html";
		skipCache = true;
	}

	var filename = path.join(__dirname, './static/', pathname);
	var dirname = path.join(__dirname, './static', reqpath);

	fs.stat(filename, function (err, stats) {
		
		if (err) {

			if (reqpath.substr(-1) === "/") {

				fs.readdir(dirname, function (err, files) {
					
					if (err) {
						res.writeHead(403, {'Content-Type': 'text/html;charset=utf-8'});
						res.end('<pre>403 Not allowed to read directory contents\n<strong>'+reqpath+'</strong><hr>'+getServerInfo()+'</pre>');
						return;
					}
					res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
					res.write("<code>Listing directory <strong>"+reqpath+"</strong><br/><br/>\n\n");
					for (var i = 0; i < files.length; i++) {
						res.write("<a href=\""+files[i]+"\">"+files[i]+"</a><br/>\n")
					}
					res.write("<hr>");
					res.write(getServerInfo());
					res.end("</code>");
				});

			} else {
				res.writeHead(404, {'Content-Type': 'text/html;charset=utf-8'});
				res.end('<pre>404 Not found\n<strong>'+reqpath+'</strong><hr>'+getServerInfo()+'</pre>');
			}
			
			return;
		} else {
			
		}

		if (reqpath.substr(-1) !== "/" && stats.isDirectory()) {
			res.writeHead(302, {'Content-Type': 'text/plain;charset=utf-8', 'Location': reqpath+'/'});
			res.end('302 Redirection');
			return;
		}
		
		var isCached = false;

		if (req.headers['if-modified-since'] && !skipCache) {
			var req_date = new Date(req.headers['if-modified-since']);
			if (stats.mtime <= req_date && req_date <= Date.now()) {
				res.writeHead(304, {
					'Last-Modified': stats.mtime
				});
				res.end();
				isCached = true;
			}
		}
		if (!isCached) {
			
			var type = mime.lookup(filename);

			var headers = {
				'Content-Type': type+';charset=utf-8'
			};
			if (!skipCache) {
				headers['Last-Modified'] = stats.mtime;
			}

			var stream = fs.createReadStream(filename);
			var acceptEncoding = req.headers['accept-encoding'] || '';

			fs.readFile(filename, function (err, data) {

				function sendBody (buf) {
					headers['Content-Length'] = buf.length;
					res.writeHead(200, headers);
					res.end(buf);
				}

				if (err) {
					if (reqpath.substr(-1) !== "/") {
						res.writeHead(404, {'Content-Type': 'text/html;charset=utf-8'});
						res.end('<pre>404 Not found\n<strong>'+reqpath+'</strong>\n\nThis should not happen (dir).</pre>');
					} else {
						res.writeHead(404, {'Content-Type': 'text/html;charset=utf-8'});
						res.end('<pre>404 Not found\n<strong>'+reqpath+'</strong>\n\nThis should not happen (file).</pre>');
					}
					
				} else {
					if (acceptEncoding.match(/\bdeflate\b/)) {
						zlib.deflate(data, function (err, cdata) {
							if (err) {
								sendBody(data);
							} else {
								headers['Content-Encoding'] =  'deflate';
								sendBody(cdata);
							}
						});
					} else if (acceptEncoding.match(/\bgzip\b/)) {
						zlib.gzip(data, function (err, cdata) {
							if (err) {
								sendBody(data);
							} else {
								headers['Content-Encoding'] =  'gzip';
								sendBody(cdata);
							}
						});
					} else {
						sendBody(data);
					}
				}
			});
		}
	});
}


// "http://http-live.sr.se/p4blekinge-mp3-192"