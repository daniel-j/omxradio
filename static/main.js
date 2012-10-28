'use strict';

function xhr(uri, cb) {
	var x = new XMLHttpRequest();
	x.open('get', uri, true);
	x.onload = function () {
		cb && cb(x.response);
	};
	x.onerror = function () {
		cb && cb(false);
	};
	x.send();
}

var nowPlaying = "";
var nowPlayingOutput = document.getElementById('nowPlaying');

var stations = document.getElementById('stations');
var stationsForm = document.getElementById('stationsForm');
var queueStationBtn = document.getElementById('queueStationBtn');
var playStationBtn = document.getElementById('playStationBtn');
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
	queueStationBtn.disabled = !active;
	playStationBtn.disabled = !active;

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
			xhr(url);
		}
	}, false);
}
function setNowPlaying(np) {
	nowPlayingOutput.innerHTML = np;
	nowPlaying = np;
	console.log("Now playing:", np);
}

stationsForm.addEventListener('submit', function (e) {
	e.preventDefault();
	if (stations.selectedIndex > 0 && isActive) {

		var url = stations.value;
		var title = stations.options[stations.selectedIndex].textContent;
		
		setActive(false);
		xhr('/omx/start?path='+encodeURIComponent(url)+"&title="+encodeURIComponent(title), function () {
			setActive(true);
			
		});
	}
}, false);

searchForm.addEventListener('submit', function (e) {
	e.preventDefault();
	var q = searchInput.value;
	if (q.length > 0 && isActive) {
		setActive(false);
		xhr('/search?q='+encodeURIComponent(q), function (html) {
			setActive(true);
		});
	}
}, false);

queueStationBtn.addEventListener('click', function () {
	var url = stations.value;
	var title = stations.options[stations.selectedIndex].textContent;
	if (stations.selectedIndex > 0 && isActive) {
		setActive(false);
		xhr('/queue/add?url='+encodeURIComponent(url)+"&title="+encodeURIComponent(title), function () {
			setActive(true);
		});
	}
});

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
		});
	}
}, false);

playQueueBtn.addEventListener('click', function () {
	if (isActive) {
		setActive(false);
		xhr('/queue/start', function () {
			setActive(true);
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

function QueueItem(params, table) {
	this.url = params.url;
	this.site = params.site || params.url;
	this.title = params.title || this.site;
	this.id = params.id;
	
	var a = document.createElement('a');
	a.href = this.site;
	a.textContent = this.title;
	var awrap = document.createElement('div');
	awrap.style.overflow = "hidden";
	awrap.style.width = "100%";
	awrap.appendChild(a);
	var removeBtn = document.createElement('button');
	removeBtn.className = 'queueItemBtn';
	removeBtn.textContent = 'x';
	var moveUpBtn = document.createElement('button');
	moveUpBtn.className = 'queueItemBtn queueMoveButton';
	moveUpBtn.innerHTML = '&uarr;';

	var row = table.insertRow(-1);
	row.className = "queueItem";
	for (var i = 0; i < 3; i++) row.insertCell(-1);
	var cells = row.cells;
	cells[1].style.width = "27px";
	cells[2].style.width = "30px";
	cells[0].appendChild(awrap);
	cells[1].appendChild(moveUpBtn);
	cells[2].appendChild(removeBtn);

	this.row = row;

	var self = this;
	removeBtn.addEventListener('click', function () {
		xhr('/queue/remove?id='+self.id);
	}, false);
	moveUpBtn.addEventListener('click', function () {
		xhr('/queue/moveup?id='+self.id);
	}, false);

}

function handleEvents(data) {

	

	if (data.nowPlaying !== undefined) {
		setNowPlaying(data.nowPlaying);
	}
	if (data.queue !== undefined) {
		if (data.queue.list !== undefined) {
			queue = [];
			queueDiv.innerHTML = '<table border=0 style="table-layout: fixed; width: 100%;" cellspacing=0 cellpadding=0></table>';
			for (var i = 0; i < data.queue.list.length; i++) {
				var item = new QueueItem(data.queue.list[i], queueDiv.firstChild);
				queue.push(item);
			}
			console.log('Got queue list. This should only happen once.');
			
		} else if (data.queue.add !== undefined) {
			var item = new QueueItem(data.queue.add, queueDiv.firstChild);
			queue.push(item);
			console.log('added  ', item.id, item.title);
		} else if (data.queue.remove !== undefined) {
			console.log('trying to remove', data.queue.remove);
			for (var i = 0; i < queue.length; i++) {
				if (queue[i].id === data.queue.remove) {
					queueDiv.firstChild.deleteRow(i);
					console.log('removed', queue[i].id, queue[i].title);
					queue.splice(i, 1);
					i--;
				}
			}
		} else if (data.queue.moveup !== undefined) {
			console.log('trying to move up', data.queue.moveup);
			for (var i = 1; i < queue.length; i++) {
				if (queue[i].id === data.queue.moveup) {
					console.log('moved up', queue[i].id, queue[i].title);

					queue[i].row.parentNode.insertBefore(queue[i].row, queue[i-1].row);

					var tmp = queue[i];
					queue[i] = queue[i-1];
					queue[i-1] = tmp;
					break;
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


