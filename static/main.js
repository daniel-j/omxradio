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

var searchForm    = document.getElementById('searchForm');
var searchInput  = document.getElementById('searchInput');
var queueBtn = document.getElementById('queueBtn');
var playBtn = document.getElementById('playBtn');

var backwardBtn  = document.getElementById('backwardBtn');
var forwardBtn   = document.getElementById('forwardBtn');
var playPauseBtn = document.getElementById('playPauseBtn');

var playQueueBtn = document.getElementById('playQueueBtn');
var queueDiv = document.getElementById('queueDiv');

bindButton(backwardBtn, '/omx/backward');
bindButton(forwardBtn, '/omx/forward');
bindButton(playPauseBtn, '/omx/playpause');

var isActive = true;
var queue = [];

function setActive(active) {
	isActive = active;
	stations.disabled = !active;

	queueBtn.disabled = !active;
	playBtn.disabled = !active;

	stopBtn.disabled = !active;
	backwardBtn.disabled = !active;
	forwardBtn.disabled = !active;
	playPauseBtn.disabled = !active;

	playQueueBtn.disabled = !active;
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

searchForm.addEventListener('submit', function (e) {
	e.preventDefault();
	var q = searchInput.value;
	if (q.length > 0 && isActive) {
		setActive(false);
		xhr('/search?q='+encodeURIComponent(q), function (html) {
			stations.selectedIndex = 0;
			setActive(true);
		});
	}
}, false);

queueBtn.addEventListener('click', function () {
	var q = searchInput.value;
	if (q.length > 0 && isActive) {
		setActive(false);
		xhr('/search?q='+encodeURIComponent(q)+"&queue", function () {
			setActive(true);
		});
	}
});

stopBtn.addEventListener('click', function () {
	if (isActive) {
		setActive(false);
		xhr('/omx/stop', function () {
			setActive(true);
			stations.selectedIndex = 0;
		});
	}
}, false);

playQueueBtn.addEventListener('click', function () {
	if (isActive) {
		setActive(false);
		xhr('/queue/start', function () {
			setActive(true);
			stations.selectedIndex = 0;
		});
	}
}, false);


/*function longPolling() {
	var x = xhr('/nowplaying?current='+encodeURIComponent(nowPlaying), function (res) {
		if (res !== false) {
			setNowPlaying(res);
			longPolling();
		} else {
			setTimeout(longPolling, 5000); // Error
		}
		
	});
}*/

function QueueItem(params) {
	this.url = params.url;
	this.site = params.site || params.url;
	this.title = params.title || this.site;
	this.id = params.id;
	this.node = document.createElement('div');
	this.node.className = "queueItem";
	var a = document.createElement('a');
	a.href = this.site;
	a.textContent = this.title;
	var removeBtn = document.createElement('button');
	removeBtn.className = 'removeBtn';
	removeBtn.textContent = 'x';
	this.node.appendChild(removeBtn);
	this.node.appendChild(a);
	var self = this;
	removeBtn.addEventListener('click', function () {
		
		xhr('/queue/remove?id='+self.id, function () {

		});
	}, false);

}

function handleEvents(data) {

	

	if (data.nowPlaying !== undefined) {
		setNowPlaying(data.nowPlaying);
	}
	if (data.queue !== undefined) {
		if (data.queue.list !== undefined) {
			queue = [];
			queueDiv.innerHTML = "";
			for (var i = 0; i < data.queue.list.length; i++) {
				var item = new QueueItem(data.queue.list[i]);
				queue.push(item);
				queueDiv.appendChild(item.node);
			}
			console.log('Got queue list. This should only happen once.');
			
		} else if (data.queue.add !== undefined) {
			var item = new QueueItem(data.queue.add);
			queue.push(item);
			queueDiv.appendChild(item.node);
			console.log('added  ', item.id, item.title);
		} else if (data.queue.remove !== undefined) {
			console.log('trying to remove', data.queue.remove);
			for (var i = 0; i < queue.length; i++) {
				if (queue[i].id === data.queue.remove) {
					queueDiv.removeChild(queue[i].node);
					console.log('removed', queue[i].id, queue[i].title);
					queue.splice(i, 1);
					i--;
					
					
				}
			}
		}
	}

}

if (window.EventSource) {

	var source = new EventSource('/events');

	source.addEventListener('message', function (e) {
		var data = JSON.parse(e.data);
		handleEvents(data);
	}, false);

} else {
	checkUpdate();
	setInterval(checkUpdate, 5*1000);
}

function checkUpdate() { // For legacy browsers that don't support EventSource
	xhr('/events', function (res) {
		if (res) {
			var data = JSON.parse(res);
			handleEvents(data);
		}
	});
}


