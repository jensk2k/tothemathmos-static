var squares = new Array();
var sizeX = 40;
var sizeY = 6;
var it = 0;
var ani = 0;

function initBanner() {
	for (var x = 0; x < sizeX; x++) {
			squares[x] = new Array();
	}
	setInterval(drawBanner, 200);
}

function drawBanner() {
	switch (ani) {
		case 0:
			generateRandomSquares();
			break;
		case 1:
			generateSeqSquares1();
			break;
		case 2:
			generateSeqSquares2();
			break;
	}
	
	var logoTxt = new Image();
	logoTxt.src = "images/banner.png";
	var canvas = document.getElementById("bannerbg");
	if (canvas.getContext) {
	var ctx = canvas.getContext("2d");
	for (var y = 0; y < sizeY; y++) {
		for (var x = 0; x < sizeX; x++) {
				ctx.fillStyle = squares[x][y];
				ctx.fillRect (x*25, y*25, 25, 25);
			}
		}
	} 
	
	ctx.drawImage(logoTxt, 0, 0);
	it++;
	if (it > 50) {
		it = 0;
		ani++;
		if (ani > 2)
			ani = 0;
	}
	
}

function generateRandomSquares() {
	for (var y = 0; y < sizeY; y++) {
		for (var x = 0; x < sizeX; x++) {
			squares[x][y] = numToHexCol(Math.random());
		}
	}
}

function generateSeqSquares1() {
	for (var y = 0; y < sizeY; y++) {
		for (var x = 0; x < sizeX; x++) {
			squares[x][y] = numToHexCol(((it/50)*0.5+(((x+1)*(y+1))/(sizeX*sizeY))*0.5)%1);
		}
	}
}

function generateSeqSquares2() {
	for (var y = 0; y < sizeY; y++) {
		for (var x = 0; x < sizeX; x++) {
			squares[x][y] = numToHexCol(((it/50)+(((x+1)*(y+1))/(sizeX*sizeY)))%1);
		}
	}
}

// only numbers between 0 and 1
function numToHexCol (num) {
	var tmp = Math.floor(num*16777215).toString(16);
	var Os = "";
	for (var i = 0; i < 6 - tmp.length; i++) {
		Os += '0';
	}
	
	return '#'+ Os + tmp;
}