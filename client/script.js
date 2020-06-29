var socket = io();

var connected = false;
var latency = -1;

socket.on('connect', () => {
	connected = true;
})

socket.on('disconnect', () => {
	connected = false;
	latency = -1
})

socket.on('pong', function(ms) {
    latency = ms;
});

socket.on('leaderboard_update', data => {
	var template = document.querySelector('#row-template');
	var parent = document.querySelector('#parent');

	parent.innerHTML = '';

	data.forEach((item, index) => {
		var clone = template.content.cloneNode(true);

		let wr = "0%";
		if ((item.wins + item.losses) !== 0) wr = (item.wins * 100 / (item.wins + item.losses)).toFixed(0) + "%"

		let p = clone.querySelector("div.name_bar > p");
		p.innerText = (index + 1).toString() + ". " + item.name;

		let bar = clone.querySelector("div.name_bar > div > div");
		bar.style.width = wr;

		let points = clone.querySelector("div.points");
		points.innerText = "WR " + wr + " " + item.wins + "-" + item.losses;

		parent.appendChild(clone)
	})
})

socket.emit('trigger_leaderboard')