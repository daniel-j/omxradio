var nowPlaying = document.getElementById('nowPlaying');

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

function setActive(active) {
	stations.disabled = !active;
	stopBtn.disabled = !active;
	customPath.disabled = !active;
	youtubeSearch.disabled = !active;

	backwardBtn.disabled = !active;
	forwardBtn.disabled = !active;
	playPauseBtn.disabled = !active;
}

function bindButton(btn, url) {
	btn.addEventListener('click', function () {
		xhr(url, function () {
			setActive(true);
		});
	}, false);
}
function setNowPlaying(title) {
	nowPlaying.textContent = title;
}

stopBtn.addEventListener('click', function () {
	setActive(false);
	xhr('/omx/stop', function () {
		setActive(true);
		setNowPlaying("");
		stations.selectedIndex = 0;
	});
}, false);

stations.addEventListener('change', function (e) {
	if (stations.selectedIndex > 0) {
		var title = stations.options[stations.selectedIndex].textContent;
		setActive(false);
		xhr('/omx/start?path='+encodeURIComponent(stations.value)+"&title="+encodeURIComponent(title), function () {
			setNowPlaying(title);
			setActive(true);
		});
	}
}, false);
customUrlForm.addEventListener('submit', function (e) {
	e.preventDefault();
	var url = customPath.value;
	if (url.length > 0) {
		setActive(false);
		xhr('/omx/start?path='+encodeURIComponent(url), function () {
			stations.selectedIndex = 0;
			setNowPlaying(url);
			setActive(true);
		});
	}
});
youtubeForm.addEventListener('submit', function (e) {
	e.preventDefault();
	var q = youtubeSearch.value;
	if (q.length > 0) {
		setActive(false);
		xhr('/youtube/search?q='+encodeURIComponent(q), function (title) {
			stations.selectedIndex = 0;
			setNowPlaying(title);
			setActive(true);
		});
	}
}, false);


xhr('/nowplaying', setNowPlaying);

setInterval(function () {
	xhr('/nowplaying', setNowPlaying);
}, 5000);

function xhr(uri, cb) {
	var x = new XMLHttpRequest();
	x.open('get', uri, true);
	x.onload = function () {
		cb(x.response);
	};
	x.onerror = function () {
		cb('');
	};
	x.send();
};