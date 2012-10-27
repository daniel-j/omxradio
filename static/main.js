'use strict';

function xhr(uri, cb) {
	var x = new XMLHttpRequest();
	x.open('get', uri, true);
	x.onload = function () {
		cb(x.response);
	};
	x.onerror = function () {
		cb(false);
	};
	x.send();
}

var nowPlaying = "";
var nowPlayingOutput = document.getElementById('nowPlaying');

var stations = document.getElementById('stations');
var stopBtn  = document.getElementById('stopBtn');

var customPath = document.getElementById('customPath');
var customUrlForm  = document.getElementById('customUrlForm');

var youtubeForm    = document.getElementById('youtubeForm');
var youtubeSearch  = document.getElementById('youtubeSearch');

var backwardBtn  = document.getElementById('backwardBtn');
var forwardBtn   = document.getElementById('forwardBtn');
var playPauseBtn = document.getElementById('playPauseBtn');

bindButton(backwardBtn, '/omx/backward');
bindButton(forwardBtn, '/omx/forward');
bindButton(playPauseBtn, '/omx/playpause');

var isActive = true;

function setActive(active) {
	isActive = active;
	stations.disabled = !active;

	stopBtn.disabled = !active;
	backwardBtn.disabled = !active;
	forwardBtn.disabled = !active;
	playPauseBtn.disabled = !active;
}

function bindButton(btn, url) {
	btn.addEventListener('click', function () {
		if (isActive) {
			xhr(url, function () {
				setActive(true);
			});
		}
	}, false);
}
function setNowPlaying(np) {
	nowPlayingOutput.innerHTML = np;
	nowPlaying = np;
	//console.log("Now playing:", nowPlaying);
}

stopBtn.addEventListener('click', function () {
	if (isActive) {
		setActive(false);
		xhr('/omx/stop', function () {
			setActive(true);
			stations.selectedIndex = 0;
		});
	}
}, false);

stations.addEventListener('change', function (e) {
	if (stations.selectedIndex > 0 && isActive) {

		var url = stations.value;
		var title = stations.options[stations.selectedIndex].textContent;
		stations.blur();
		setActive(false);
		xhr('/omx/start?path='+encodeURIComponent(url)+"&title="+encodeURIComponent(title), function () {
			setActive(true);
			stations.focus();
		});
	}
}, false);
customUrlForm.addEventListener('submit', function (e) {
	e.preventDefault();
	var url = customPath.value;
	if (url.length > 0 && isActive) {
		setActive(false);
		xhr('/omx/start?path='+encodeURIComponent(url), function () {
			stations.selectedIndex = 0;
			setActive(true);
		});
	}
});
youtubeForm.addEventListener('submit', function (e) {
	e.preventDefault();
	var q = youtubeSearch.value;
	if (q.length > 0 && isActive) {
		setActive(false);
		xhr('/youtube/search?q='+encodeURIComponent(q), function (html) {
			stations.selectedIndex = 0;
			setActive(true);
		});
	}
}, false);


function longPolling() {
	var x = xhr('/nowplaying?current='+encodeURIComponent(nowPlaying), function (res) {
		if (res !== false) {
			setNowPlaying(res);
			longPolling();
		} else {
			setTimeout(longPolling, 5000); // Error
		}
		
	});
}

if (window.EventSource) {
	var source = new EventSource('/events');
	source.addEventListener('message', function (e) {
		var data = JSON.parse(e.data);
		if (data.nowPlaying !== undefined) {
			setNowPlaying(data.nowPlaying)
		}
	}, false);
} else {
	xhr('/nowplaying?init', function (np) {
		setNowPlaying(np);
		longPolling();
	});
}


