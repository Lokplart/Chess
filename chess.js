var boardOffsetX = 8;
var boardOffsetY = 8;
var pieceOffsetX = 40;
var pieceOffsetY = 50;
const baseX = 0;
const baseY = 0;
const baseMult = 80;

boardMatrix = [];
for(var i=0; i<8; i++) {
    boardMatrix[i] = [];
    for(var j=0; j<8; j++) {
        boardMatrix[i][j] = null;
    }
}

function startChess() {
	var playerColor = "black";
	Chess.initBoard(playerColor);
	Chess.initPieces(playerColor);
	Chess.getPositionsMatrix(playerColor);

	Chess.selectedPiece = null;
}
var Chess = {
	board : document.createElement("canvas"),
	initBoard : function(playerColor) {
		this.board.width = 640;
		this.board.height = 640;
		this.board.style = "border: 1px solid black;"
		this.context = this.board.getContext("2d");

		this.div = document.getElementById("board")
		this.div.insertBefore(this.board, this.div.childNodes[0]);
		boardOffsetX += this.div.offsetTop
		boardOffsetY += this.div.offsetLeft;
		pieceOffsetX += this.div.offsetTop;
		pieceOffsetY += this.div.offsetLeft;
 		
		cookies = document.cookie
		this.nickname = cookies.slice(cookies.indexOf("=")+1, cookies.indexOf(";"));
		this.wins = cookies.slice(cookies.lastIndexOf("=")+1)
 		document.getElementById("player_info").appendChild(document.createTextNode(this.nickname + " :" + this.wins))

		this.pieceMove  = new sound("sounds/piece_move.mp3");
		this.pieceTake  = new sound("sounds/piece_take.mp3");
		this.pieceSlide = new sound("sounds/piece_slide.mp3");
		this.pieceCheck = new sound("sounds/piece_check.mp3");
		
		this.baordImage = new Image();
		this.baordImage.src = "images/board_" + playerColor + ".png"
		this.baordImage.onload = function() {
			Chess.context.drawImage(this, 0, 0);
		}

		//document.body.insertBefore(this.board, document.body.childNodes[0]);

		this.board.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); }

		this.selectedPiece = null;
		this.clearSelectedPiece = false;

		this.highlight = new Image();
		this.highlight.src = "images/highlight.png";
		this.highlightOldX = null;
		this.highlightOldY = null;
		this.highlightNewX = null;
		this.highlightNewY = null;
		this.selectedHighlightX = null;
		this.selectedHighlightY = null;

		this.possibleMove = new Image();
		this.possibleMove.src = "images/move.png";
		this.possibleCapture = new Image();
		this.possibleCapture.src = "images/capture.png";

		this.expectedColor = "white";
		this.trustedValidMove = false;
		this.playerColor = playerColor;

		this.captureHistory = [];
		this.moveHistory = [];
		this.moveCursor = null;
		this.branchCursor = 0;
		this.noLog = false;
		this.positionsMatrix = []
		for(var i=0; i<8; i++) {
		    this.positionsMatrix[i] = [];
		}

		this.inCheck = null;
		this.attackerPos = [];
		this.checkmate = false;

		this.board.addEventListener("mousedown", function(ev) {
			if (Chess.selectedPiece == null) {	
				Chess.selectedPiece = boardMatrix[parseInt((ev.clientY-boardOffsetY)/80)][parseInt((ev.clientX-boardOffsetX)/80)];
				if (Chess.selectedPiece != null) {
					Chess.pieceToMouse(ev);
				}
				else {
					console.log("No piece in square");
				}
			}
			else {
				if (boardMatrix[parseInt((ev.clientY-boardOffsetY)/80)][parseInt((ev.clientX-boardOffsetX)/80)] == null) {
					Chess.clearSelectedPiece = true
				}
				else {
					var newPx = parseInt((ev.clientY-boardOffsetY)/80);
					var newPy = parseInt((ev.clientX-boardOffsetX)/80);
					if (Chess.selectedPiece.color != Chess.expectedColor || !Chess.selectedPiece.validMoves.includes(newPx.toString() + newPy.toString())) {
						Chess.selectedPiece = boardMatrix[newPx][newPy]
						Chess.pieceToMouse(ev);
					}
				}
			}
		}, false);

		this.board.addEventListener("mouseup", function(ev) {
			document.onmousemove = null;
			if (Chess.selectedPiece != null && Chess.selectedPiece.color == Chess.expectedColor) {
				var newPx = parseInt((ev.clientY-boardOffsetY)/80);
				var newPy = parseInt((ev.clientX-boardOffsetX)/80);
				if ((newPx != Chess.selectedPiece.px || newPy != Chess.selectedPiece.py) && Chess.selectedPiece.validMoves.includes(newPx.toString() + newPy.toString())) {
					Chess.selectedPiece.place(newPx, newPy, true);	
					
					if (Chess.expectedColor == "white") { Chess.expectedColor = "black"; }
					else 								{ Chess.expectedColor = "white"; }

					Chess.trustedValidMove = false;
					Chess.selectedPiece = null;
				}
				else {
					Chess.selectedPiece.place(Chess.selectedPiece.px, Chess.selectedPiece.py, false);
				}
			}
			if (Chess.clearSelectedPiece == true) {
				Chess.selectedPiece = null;
				Chess.clearSelectedPiece = false;
			}
			Chess.clear();
		}, false);
	},

	pieceToMouse : function(ev) {
		if (this.selectedPiece.color == this.expectedColor) {
			this.selectedPiece.move(ev.pageY-pieceOffsetY, ev.pageX-pieceOffsetX);
			this.selectedHighlightX = this.selectedPiece.py*80;
			this.selectedHighlightY = this.selectedPiece.px*80;
			this.clear();
			this.selectedPiece.move(ev.pageY-pieceOffsetY, ev.pageX-pieceOffsetX);

			document.onmousemove = function(ev) {
				Chess.clear();
				//Chess.context.drawImage(Chess.highlight, Chess.selectedPiece.py*80, Chess.selectedPiece.px*80);
				if (ev.clientY-boardOffsetY >= 0 && ev.clientY-boardOffsetY <= 640 && ev.clientX-boardOffsetX >= 0 && ev.clientX-boardOffsetX <= 640) {
					Chess.selectedPiece.move(ev.clientY-pieceOffsetY, ev.clientX-pieceOffsetX);
				}
				else {
					Chess.selectedPiece.move(Chess.selectedPiece.x, Chess.selectedPiece.y);
				}
			}
		}
		else {
			console.log("Wrong color");
			this.selectedHighlightX = null;
			this.selectedHighlightY = null;
		}
	},
	initPieces : function(playerColor) {
		var i = 6;
		if (playerColor == "white") {
			var opponentColor = "black";
		}
		else {
			var opponentColor = "white";
		}

		for (var j = 0; j < 8; j++) {
			boardMatrix[i][j] = new Piece(i, j, playerColor, "pawn");
			boardMatrix[i-5][j] = new Piece(i-5, j, opponentColor, "pawn");
		}
		i++;
		for (var j = 0; j < 8; j++) {
			if (j == 0 || j == 7) {
				boardMatrix[i][j] = new Piece(i, j, playerColor, "rook");
				boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "rook");
			}
			if (j == 1 || j == 6) {
				boardMatrix[i][j] = new Piece(i, j, playerColor, "knight");
				boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "knight");
			}
			if (j == 2 || j == 5) {
				boardMatrix[i][j] = new Piece(i, j, playerColor, "bishop");
				boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "bishop");
			}
			if (j == 3) {
				if (playerColor == "black") {
					boardMatrix[i][j] = new Piece(i, j, playerColor, "king");
					boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "king");
				}
				else {
					boardMatrix[i][j] = new Piece(i, j, playerColor, "queen");
					boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "queen");
				}
			}
			if (j == 4) {
				if (playerColor == "white") {
					boardMatrix[i][j] = new Piece(i, j, playerColor, "king");
					boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "king");
				}
				else {
					boardMatrix[i][j] = new Piece(i, j, playerColor, "queen");
					boardMatrix[i-7][j] = new Piece(i-7, j, opponentColor, "queen");
				}
			}
		}
		this.getMoves()
	},
	getMoves : function() {
		//console.clear();
		this.inCheck = null;
		this.attackerPos = [];

		var kings = []
		for (var i = 0; i < 8; i++) {
			for (var j = 0; j < 8; j++) {
				if (boardMatrix[i][j] != null) {
					//console.log(boardMatrix[i][j]);
					if (boardMatrix[i][j].type == "king") {
						kings.push(i.toString() + j);
					} 
					else {
						boardMatrix[i][j].getValidMoves();
					}
				} 
			}
		}

		for (var i = 0; i < 8; i++) {
			for (var j = 0; j < 8; j++) {
				if (boardMatrix[i][j] != null && boardMatrix[i][j].pinned == true) {
					boardMatrix[i][j].validMoves = [];
				} 
			}
		}
		boardMatrix[parseInt(kings[0][0])][parseInt(kings[0][1])].getValidMoves();
		boardMatrix[parseInt(kings[1][0])][parseInt(kings[1][1])].getValidMoves();
		boardMatrix[parseInt(kings[0][0])][parseInt(kings[0][1])].getValidMoves();
		if (this.inCheck != null) {
			var unblockableCheck = false;
			var blockableCounter = 0;
			var validMoves = [];
			if (this.attackerPos.length < 2) {
				var atkX = parseInt(this.attackerPos[0][0]);
				var atkY = parseInt(this.attackerPos[0][1]);
				validMoves.push(atkX.toString()+atkY);
				if (boardMatrix[atkX][atkY].type == "pawn" || boardMatrix[atkX][atkY].type == "knight") {
					unblockableCheck = true;
				}
				else if (unblockableCheck == false) {
					blockableCounter++;
					if (blockableCounter < 2) {
						var kingX = 0;
						var kingY = 0;
						if (boardMatrix[kings[0][0]][kings[0][1]].color == this.inCheck) {
							kingX = parseInt(kings[0][0]);
							kingY = parseInt(kings[0][1]);
						}
						else {
							kingX = parseInt(kings[1][0]);
							kingY = parseInt(kings[1][1]);
						}
						var multX = 0;
						var multY = 0;
						if (atkX < kingX) 	   { multX = 1; }
						else if (atkX > kingX) { multX = -1; }
						if (atkY < kingY)      { multY = 1; }
						else if (atkY > kingY) { multY = -1; }

						rangeX = atkX + multX;
						rangeY = atkY + multY;
						while (rangeX != kingX || rangeY != kingY) {
							validMoves.push(rangeX.toString()+rangeY);
							if (rangeX != kingX) {
								rangeX += multX;
							}
							if (rangeY != kingY) {
								rangeY += multY;
							}
						}
					}	
				}
			}
			for (var i = 0; i < 8; i++) {
				for (var j = 0; j < 8; j++) {
					if (boardMatrix[i][j] != null && boardMatrix[i][j].color == this.inCheck) {
						for (var k = 0; k < boardMatrix[i][j].validMoves.length; k++) {
							if (boardMatrix[i][j].type != "king" && !validMoves.includes(boardMatrix[i][j].validMoves[k])) {
								boardMatrix[i][j].validMoves.splice(k, 1);
								k--;
							}
							else if (boardMatrix[i][j].type == "king" && validMoves.includes(boardMatrix[i][j].validMoves[k]) && (parseInt(boardMatrix[i][j].validMoves[k][0]) != atkX || parseInt(boardMatrix[i][j].validMoves[k][1]) != atkY)) {
								boardMatrix[i][j].validMoves.splice(k, 1);
								k--;
							}
						}
					} 
				}
			}
			hasMoves = false;
			//checking for checkmate
			for (var i = 0; i < 8 && hasMoves == false; i++) {
				for (var j = 0; j < 8 && hasMoves == false; j++) {
					if (boardMatrix[i][j] != null && boardMatrix[i][j].color == this.inCheck && boardMatrix[i][j].validMoves.length != 0) {
						hasMoves = true;
					} 
				}
			}

			if (hasMoves == false) {
				this.checkmate = true
			}
		}
	},	
	getPositionsMatrix : function(playerColor) {
		if (playerColor == "white") {
			var k = 1;
			for (var i = 7; i >= 0; i--) {
				for (var j = 0; j < 8; j++) {
					this.positionsMatrix[i][j] = this.numToLetter(j) + k.toString();
				}
				k++;
			}
		}
		else {
			var k = 7;
			for (var i = 0; i < 8; i++) {
				k = 7;
				for (var j = 0; j < 8; j++) {
					this.positionsMatrix[i][j] = this.numToLetter(k) + (i+1).toString();
					k--
				}
			}
		}
	},
	numToLetter : function(num) {
		switch (num) {
			case 0: return "a";
			case 1: return "b";
			case 2: return "c";
			case 3: return "d";
			case 4: return "e";
			case 5: return "f";
			case 6: return "g";
			case 7: return "h";
		}
	},
	letterToNum : function(letter) {
		switch (letter) {
			case "a": return 0;
			case "b": return 1;
			case "c": return 2;
			case "d": return 3;
			case "e": return 4;
			case "f": return 5;
			case "g": return 6;
			case "h": return 7;
		}
	},
	moveToString : function(move) {
		for (var i = 0; i < 8; i++) {
			for (var j = 0; j < 8; j++) {
				if (this.positionsMatrix[i][j] == move) {
					return i.toString() + j.toString();
				}
			}
		}
	},
	isSafeSquare : function(color, pos) {
		for (var i = 0; i < 8; i++) {
			for (var j = 0; j < 8; j++) {
				if (boardMatrix[i][j] != null) {
					if (boardMatrix[i][j].color != color) {
						if (boardMatrix[i][j].validMoves.includes(pos)) {
							if (boardMatrix[i][j].type == "pawn") {
								if (boardMatrix[i][j].validMoves[boardMatrix[i][j].validMoves.indexOf(pos)][1] != j) {
									console.log(pos + " is under attack by " + boardMatrix[i][j].color + " " + boardMatrix[i][j].type);
									return false;
								}
							}
							else {
								console.log(pos + " is under attack by " + boardMatrix[i][j].color + " " + boardMatrix[i][j].type);
								return false;
							}
						}
						else if (boardMatrix[i][j].extendedValidMoves.includes(pos)) {
							console.log(pos + " is under attack by " + boardMatrix[i][j].color + " " + boardMatrix[i][j].type);
							return false;
						}
					}
				}
			}
		}
		return true;
	},

	clear : function() {
		this.context.clearRect(0, 0, this.board.width, this.board.height);
		this.context.drawImage(this.baordImage, 0, 0);
		if (this.highlightOldX != null) {
			this.context.drawImage(this.highlight, this.highlightOldX, this.highlightOldY);
			this.context.drawImage(this.highlight, this.highlightNewX, this.highlightNewY);
		}
		if (this.selectedPiece != null) {
			if (this.selectedHighlightX != null) {
				this.context.drawImage(this.highlight, this.selectedHighlightX, this.selectedHighlightY);
			}
			if (this.selectedPiece.color == this.expectedColor) {
				for (var i = 0; i < this.selectedPiece.validMoves.length; i++) {
					var px = this.selectedPiece.validMoves[i][0];
					var py = this.selectedPiece.validMoves[i][1];
					if (boardMatrix[px][py] == null) {
						if (this.selectedPiece.type == "pawn" && this.selectedPiece.py != py) {
							this.context.drawImage(this.possibleCapture, py*80, px*80);
						} 
						else {
							this.context.drawImage(this.possibleMove, py*80, px*80);
						}
					}
					else {
						this.context.drawImage(this.possibleCapture, py*80, px*80);
					}
				}
			}
		}
		for (var i = 0; i < 8; i++) {
			for (var j = 0; j < 8; j++) {
				if (boardMatrix[i][j] != null && (boardMatrix[i][j] != this.selectedPiece || document.onmousemove == null) && boardMatrix[i][j].placed) {
					this.context.drawImage(boardMatrix[i][j].image, boardMatrix[i][j].y, boardMatrix[i][j].x);
				}
			}
		}
	},

	getSound : function(castled) {
		if (this.inCheck != null) {
				this.moveHistory[this.branchCursor][this.moveCursor-1] += "+";
				this.pieceCheck.play();
			}
			else if (castled) {
				this.pieceSlide.play();
			}
			else if (this.moveCursor != this.moveHistory[this.branchCursor].length && this.moveHistory[this.branchCursor][this.moveCursor].includes("x")) {
				this.pieceTake.play();
			}
			else if (this.moveHistory[this.branchCursor][this.moveCursor-1] != null && this.moveHistory[this.branchCursor][this.moveCursor-1].includes("x")) {
				this.pieceTake.play();
			}
			else {
				this.pieceMove.play();
			}
	},

	logMove : function(type, oldPx, oldPy, newPx, newPy, capture) {
		console.clear();
		var move;

		switch(type) {
			case "pawn":
				move = this.positionsMatrix[oldPx][oldPy] + capture + this.positionsMatrix[newPx][newPy];
				break;
			case "knight":
				move = "N" + this.positionsMatrix[oldPx][oldPy] + capture + this.positionsMatrix[newPx][newPy];
				break;
			case "rook":
				move = "R" + this.positionsMatrix[oldPx][oldPy] + capture + this.positionsMatrix[newPx][newPy];
				break;
			case "bishop":
				move = "B" + this.positionsMatrix[oldPx][oldPy] + capture + this.positionsMatrix[newPx][newPy];
				break;
			case "queen":
				move = "Q" + this.positionsMatrix[oldPx][oldPy] + capture + this.positionsMatrix[newPx][newPy];
				break;
			case "king":
				move = "K" + this.positionsMatrix[oldPx][oldPy] + capture + this.positionsMatrix[newPx][newPy];
				break;
		}

		if (this.moveHistory[this.branchCursor] == null) {
			this.moveHistory[this.branchCursor] = [];
			this.moveHistory[this.branchCursor].push(move);

			if (capture == "x") {
				this.logCapture(newPx, newPy);
			}

			this.moveCursor += 1;
		}
		else {
			if (this.moveHistory[this.branchCursor][this.moveCursor] == null) {
				this.moveHistory[this.branchCursor].push(move);

				if (capture == "x") {
					this.logCapture(newPx, newPy);
				}

				this.moveCursor += 1;
			}
			else {
				//this.moveCursor += 1;
				var foundMove = false;
				var currentBranch = this.branchCursor;
				while (this.moveHistory[currentBranch] != null && foundMove == false) {
					if (this.moveHistory[currentBranch][this.moveCursor] == move) {
						foundMove = true;		
					}
					currentBranch += 1;
				}


				if (!foundMove) {
					this.branchCursor = this.moveHistory.length;
					this.moveHistory[this.branchCursor] = [];
					this.moveHistory[this.branchCursor][this.moveCursor] = move;

					if (capture == "x") {
						this.logCapture(newPx, newPy);
					}

					this.moveCursor += 1;
				}
				else {
					this.branchCursor = currentBranch;
					this.moveCursor += 1;
				}
			}
		}
		console.log(this.moveHistory);
		console.log(this.captureHistory);
		console.log(this.branchCursor + ", " + this.moveCursor);
	},
	logCapture: function(px, py) {
		if (this.captureHistory[this.branchCursor] == null) {
			this.captureHistory[this.branchCursor] = [];
		}
		if (this.captureHistory[this.branchCursor][this.moveCursor] == null) {
			this.captureHistory[this.branchCursor][this.moveCursor] = boardMatrix[px][py];
		}
	},
	prevMove : function() {
		if (this.moveCursor != null && this.moveCursor > 0) {
			this.moveCursor--;

			//console.log(this.branchCursor + ", " + this.moveCursor);

			var move = this.moveHistory[this.branchCursor][this.moveCursor];
			if (move[0] < "Z") { move = move.slice(1, move.length); }
			if (move.includes("x")) { move = move.slice(0, move.indexOf("x")) + move.slice(move.indexOf("x")+1); }

			var newPos = this.moveToString(move[0] + move[1]);
			var currentPos = this.moveToString(move[2] + move[3]);

			boardMatrix[parseInt(currentPos[0])][parseInt(currentPos[1])].place(parseInt(newPos[0]), parseInt(newPos[1]), true, false);

			if (this.expectedColor == "white") { this.expectedColor = "black"; }
			else 							   { this.expectedColor = "white"; }

			if (this.captureHistory[this.branchCursor] != null && this.captureHistory[this.branchCursor][this.moveCursor] != null) { 
				boardMatrix[parseInt(currentPos[0])][parseInt(currentPos[1])] = this.captureHistory[this.branchCursor][this.moveCursor] 
			}

			if (this.moveHistory[this.branchCursor] != null) { 
				if (this.moveHistory[this.branchCursor][this.moveCursor-1] == null && this.branchCursor != 0) {
					this.branchCursor--;
					while(this.moveHistory[this.branchCursor][this.moveCursor-1] == null) {
						this.branchCursor--;
					}
				}
			}

			this.selectedPiece = null;
			this.getMoves();
			this.clear();

			console.log(this.branchCursor + ", " + this.moveCursor);
		}	
	},
	nextMove : function() {
		if (this.moveCursor <= this.moveHistory[this.branchCursor].length-1) {

			//console.log(this.branchCursor + ", " + this.moveCursor);
			
			var move = this.moveHistory[this.branchCursor][this.moveCursor];
			if (move[0] < "Z") { move = move.slice(1, move.length); }
			if (move.includes("x")) { move = move.slice(0, move.indexOf("x")) + move.slice(move.indexOf("x")+1); }

			var currentPos = this.moveToString(move[0] + move[1]);
			var newPos = this.moveToString(move[2] + move[3]);

			boardMatrix[parseInt(currentPos[0])][parseInt(currentPos[1])].place(parseInt(newPos[0]), parseInt(newPos[1]), true, false);

			if (this.expectedColor == "white") { this.expectedColor = "black"; }
			else 							   { this.expectedColor = "white"; }

			this.moveCursor++;
			this.selectedPiece = null;
			this.clear();

			console.log(this.branchCursor + ", " + this.moveCursor);
		}
	},

	exportMoveHistory : function() {
		
	}
}

function Piece(x, y, color, type) {
	this.x = x*baseMult + baseX;
	this.y = y*baseMult + baseY;
	this.color = color;
	this.type = type;
	
	this.px = this.startPx = x;
	this.py = this.startPy = y;

	if (this.px < 2) {
		this.direction = 1;
	}
	else {
		this.direction = -1;
	}
 
	this.image = new Image();
	this.image.src = "images/pieces/" + color + "_" + type + ".png";
	this.image.px = this.x;
	this.image.py = this.y;

	this.validMoves = [];
	this.extendedValidMoves = [];
	
	this.image.onload = function() {
		Chess.context.drawImage(this, this.py, this.px);
	}
	
	this.placed = true;
	this.moved = false;

	this.pinned = false;

	this.canEnPassant = null;
	this.castled = false

	this.place = function(x, y, isValidMove, logMove = true) {
		this.placed = true;
		if (isValidMove) {
			if (logMove) {
				if (boardMatrix[x][y] == null) {
					//console.log(this.type + ", " + this.py + "/" + y + " --- " + x);
					if (this.type == "pawn" && this.py != y) {
						console.log("en passent")
						Chess.logMove(this.type, this.px, this.py, x, y, "x");
						boardMatrix[x-this.direction][y] = null;
						Chess.clear();
					} 
					else {
						Chess.logMove(this.type, this.px, this.py, x, y, "");
					}
				}
				else {
					Chess.logMove(this.type, this.px, this.py, x, y, "x");
				}
			}
			boardMatrix[x][y] = this;
			boardMatrix[this.px][this.py] = null;
			if (this.type == "king") {
				if (y - this.py == 2)  { 
					Chess.selectedPiece = boardMatrix[this.px][7]; 
					boardMatrix[this.px][7] = null;
					Chess.selectedPiece.place(this.px, y-1, true, false);
					Chess.selectedPiece = this;

					this.castled = true;

					if (Chess.playerColor == "white") {
						Chess.moveHistory[Chess.moveHistory.length-1] = "O-O";
					}
					else {
						Chess.moveHistory[Chess.moveHistory.length-1] = "O-O-O";
					}
				}
				if (y - this.py == -2) { 
					Chess.selectedPiece = boardMatrix[this.px][0];
					boardMatrix[this.px][0] = null;
					Chess.selectedPiece.place(this.px, y+1, true, false);
					Chess.selectedPiece = this;
					
					this.castled = true;


					if (Chess.playerColor == "white") {
						Chess.moveHistory[Chess.moveHistory.length-1] = "O-O-O";
					}
					else {
						Chess.moveHistory[Chess.moveHistory.length-1] = "O-O";
					}
				}
			}
			else if (this.type == "pawn") {
				if (Math.abs(this.px - x) == 2) {
					if (boardMatrix[x][y-1] != null && boardMatrix[x][y-1].color != this.color && boardMatrix[x][y-1].type == "pawn") {
						boardMatrix[x][y-1].canEnPassant = (x-this.direction).toString()+y;
						console.log("canEnPassantre");
					}
					if (boardMatrix[x][y+1] != null && boardMatrix[x][y+1].color != this.color && boardMatrix[x][y+1].type == "pawn") {
						boardMatrix[x][y+1].canEnPassant = (x+this.direction).toString()+y; 
						console.log("canEnPassantreeeee");
					}
				}
			}

			Chess.highlightOldX = this.py*80;
			Chess.highlightOldY = this.px*80; 
			Chess.highlightNewX = y*80;
			Chess.highlightNewY = x*80; 

			this.px = x; this.py = y;
			this.x = x*baseMult; this.y = y*baseMult;

			if (this.moved == false) { this.moved = true; }
			Chess.getMoves();
			Chess.getSound(this.castled);
			this.castled = false;

		}
		else {
			this.x = this.px*baseMult + baseX;
			this.y = this.py*baseMult + baseY;
			boardMatrix[this.px][this.py] = this;
		}

		if (Chess.checkmate == true) {
			document.cookie = "wins=" + (parseInt(Chess.wins)+1); 
			location.reload();
		}
		
		Chess.clear();
	}

	this.move = function(x, y) {
		if (this.placed == true) {
			this.placed = false;
		}
		this.x = x;
		this.y = y;
		Chess.context.drawImage(this.image, this.y, this.x);
	}

	this.getValidMoves = function() {
		this.validMoves = [];
		this.extendedValidMoves = [];

		if (this.color+this.type == "whitebishop") {
			console.log("hi");
		}

		switch (this.type) {
			case "pawn": 
				if (this.canEnPassant != null) {
					if (Chess.expectedColor != this.color) {
						this.validMoves.push(this.canEnPassant);
					}
					else {
						this.canEnPassant = null;
					}
				}
				if (this.px < 7 && this.px > 0) {
					if (boardMatrix[this.px+this.direction][this.py] == null) { 
						this.validMoves.push((this.px+this.direction).toString()+this.py); 
						if (this.px == this.startPx && boardMatrix[this.px+this.direction*2][this.py] == null) {
							this.validMoves.push((this.px+this.direction*2).toString()+this.py);
						}
					}
					if (boardMatrix[this.px+this.direction][this.py+1] != null && boardMatrix[this.px+this.direction][this.py+1].color != this.color) {
						if (boardMatrix[this.px+this.direction][this.py+1].tpye == "king") {
							Chess.inCheck = boardMatrix[this.px+this.direction][this.py+1].color;
							Chess.attackerPos.push(this.px.toString() + this.py)
						}
						else {
							this.validMoves.push((this.px+this.direction).toString()+(this.py+1).toString());
						}
					}
					else {
						this.extendedValidMoves.push((this.px+this.direction).toString()+(this.py+1).toString());
					}
					if (boardMatrix[this.px+this.direction][this.py-1] != null && boardMatrix[this.px+this.direction][this.py-1].color != this.color) {
						if (boardMatrix[this.px+this.direction][this.py-1].type == "king") {
							Chess.inCheck = boardMatrix[this.px+this.direction][this.py-1].color;
							Chess.attackerPos.push(this.px.toString() + this.py)
						}
						else {
							this.validMoves.push((this.px+this.direction).toString()+(this.py-1).toString());
						}
					}
					else {
						this.extendedValidMoves.push((this.px+this.direction).toString()+(this.py-1).toString());
					}
				}
				break;
			case "knight":
				var px = this.px;
				var py = this.py;

				if (px + 2 < 8) {
					if (py + 1 < 8) {
						if (boardMatrix[px+2][py+1] == null) {
							this.validMoves.push((px+2).toString() + (py+1).toString());
						}
						else if (boardMatrix[px+2][py+1].color != this.color) {
							if (boardMatrix[px+2][py+1].type == "king") {
								Chess.inCheck = boardMatrix[px+2][py+1].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}	
							else {
								this.validMoves.push((px+2).toString() + (py+1).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px+2).toString() + (py+1).toString());
						}
					}
					if (py - 1 >= 0) {
						if (boardMatrix[px+2][py-1] == null) {
							this.validMoves.push((px+2).toString() + (py-1).toString());
						}
						else if (boardMatrix[px+2][py-1].color != this.color) {
							if (boardMatrix[px+2][py-1].type == "king") {
								Chess.inCheck = boardMatrix[px+2][py-1].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px+2).toString() + (py-1).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px+2).toString() + (py-1).toString());
						}
					}
				}
				if (px - 2 >= 0) {
					if (py + 1 < 8) {
						if (boardMatrix[px-2][py+1] == null) {
							this.validMoves.push((px-2).toString() + (py+1).toString());
						}
						else if (boardMatrix[px-2][py+1].color != this.color) {
							if (boardMatrix[px-2][py+1].type == "king") {
								Chess.inCheck = boardMatrix[px-2][py+1].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px-2).toString() + (py+1).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px-2).toString() + (py+1).toString());
						}
					}
					if (py - 1 >= 0) {
						if (boardMatrix[px-2][py-1] == null) {
							this.validMoves.push((px-2).toString() + (py-1).toString());
						}
						else if (boardMatrix[px-2][py-1].color != this.color) {
							if (boardMatrix[px-2][py-1].type == "king") {
								Chess.inCheck = boardMatrix[px-2][py-1].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px-2).toString() + (py-1).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px-2).toString() + (py-1).toString());
						}
					}
				}
				if (py + 2 < 8) {
					if (px + 1 < 8) {
						if (boardMatrix[px+1][py+2] == null) {
							this.validMoves.push((px+1).toString() + (py+2).toString());
						}
						else if (boardMatrix[px+1][py+2].color != this.color) {
							if (boardMatrix[px+1][py+2].type == "king") {
								Chess.inCheck = boardMatrix[px+1][py+2].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px+1).toString() + (py+2).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px+1).toString() + (py+2).toString());
						}
					}
					if (px - 1 >= 0) {
						if (boardMatrix[px-1][py+2] == null) {
							this.validMoves.push((px-1).toString() + (py+2).toString());
						}
						else if (boardMatrix[px-1][py+2].color != this.color) {
							if (boardMatrix[px-1][py+2].type == "king") {
								Chess.inCheck = boardMatrix[px-1][py+2].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px-1).toString() + (py+2).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px-1).toString() + (py+2).toString());
						}
					}
				}
				if (py - 2 >= 0) {
					if (px + 1 < 8) {
						if (boardMatrix[px+1][py-2] == null) {
							this.validMoves.push((px+1).toString() + (py-2).toString());
						}
						else if (boardMatrix[px+1][py-2].color != this.color) {
							if (boardMatrix[px+1][py-2].type == "king") {
								Chess.inCheck = boardMatrix[px+1][py-2].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px+1).toString() + (py-2).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px+1).toString() + (py-2).toString());
						}
					}
					if (px - 1 >= 0) {
						if (boardMatrix[px-1][py-2] == null) {
							this.validMoves.push((px-1).toString() + (py-2).toString());
						}
						else if (boardMatrix[px-1][py-2].color != this.color) {
							if (boardMatrix[px-1][py-2].type == "king") {
								Chess.inCheck = boardMatrix[px-1][py-2].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
							}
							else {
								this.validMoves.push((px-1).toString() + (py-2).toString());
							}
						}
						else {
							this.extendedValidMoves.push((px-1).toString() + (py-2).toString());
						}
					}
				}
				break;
			case "rook":
				var px = this.px+1;
				var py = this.py;
				while(px < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px++;
				}
				if (px < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px++;
								while(px < 8 && boardMatrix[px][py] == null) {
									this.extendedValidMoves.push(px.toString() + py.toString());
									px++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++;
								while (px < 8 && boardMatrix[px][py] == null) { px++; }
								if (px < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}

				px = this.px-1;
				py = this.py
				while (px >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px--;
				}  
				if (px >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px--;
								while (px >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++;
								while (px >= 0 && boardMatrix[px][py] == null) { px--; }
								if (px >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}

				px = this.px;
				py = this.py+1;
				while(py < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					py++;
				}
				if (py < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								py++;
								while(py < 8 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									py++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								py++;
								while (py < 8 && boardMatrix[px][py] == null) { py++; }
								if (py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}

				px = this.px;
				py = this.py-1;
				while(py >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					py--;
				}
				if (py >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								py--;
								while(py >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									py--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								py--;
								while (py >= 0 && boardMatrix[px][py] == null) { py--; }
								if (py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				break;	
			case "bishop":
				var px = this.px+1;
				var py = this.py+1;
				while (px < 8 && py < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px++; py++;
				}
				if (px < 8 && py < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px++; py++;
								while (px < 8 && py < 8 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px++; py++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++; py++;
								while (px < 8 && py < 8 && boardMatrix[px][py] == null) { px++; py++; }
								if (px < 8 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px < 8 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				px = this.px-1;
				py = this.py+1;
				while (px >= 0 && py < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px--; py++;
				}
				if (px >= 0 && py < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px--; py++;
								while (px >= 0 && py < 8 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px--; py++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px--; py++;
								while (px >= 0 && py < 8 && boardMatrix[px][py] == null) { px--; py++; }
								if (px >= 0 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px >= 0 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				px = this.px+1;
				py = this.py-1;
				while (px < 8 && py >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px++; py--;
				}
				if (px < 8 && py >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px++; py--;
								while (px < 8 && py >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px++; py--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++; py--;
								while (px < 8 && py >= 0 && boardMatrix[px][py] == null) { px++; py--; }
								if (px < 8 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px < 8 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}	
				px = this.px-1;
				py = this.py-1;
				while (px >= 0 && py >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px--; py--;
				}
				if (px >= 0 && py >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px--; py--;
								while (px >= 0 && py >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px--; py--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px--; py--;
								while (px >= 0 && py >= 0 && boardMatrix[px][py] == null) { px--; py--; }
								if (px >= 0 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px >= 0 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				break;		
			case "queen":
				var px = this.px+1;
				var py = this.py;
				while(px < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px++;
				}
				if (px < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px++;
								while(px < 8 && boardMatrix[px][py] == null) {
									this.extendedValidMoves.push(px.toString() + py.toString());
									px++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++;
								while (px < 8 && boardMatrix[px][py] == null) { px++; }
								if (px < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}

				px = this.px-1;
				py = this.py
				while (px >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px--;
				}  
				if (px >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px--;
								while (px >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++;
								while (px >= 0 && boardMatrix[px][py] == null) { px--; }
								if (px >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}

				px = this.px;
				py = this.py+1;
				while(py < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					py++;
				}
				if (py < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								py++;
								while(py < 8 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									py++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								py++;
								while (py < 8 && boardMatrix[px][py] == null) { py++; }
								if (py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}

				px = this.px;
				py = this.py-1;
				while(py >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					py--;
				}
				if (py >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								py--;
								while(py >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									py--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								py--;
								while (py >= 0 && boardMatrix[px][py] == null) { py--; }
								if (py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				var px = this.px+1;
				var py = this.py+1;
				while (px < 8 && py < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px++; py++;
				}
				if (px < 8 && py < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px++; py++;
								while (px < 8 && py < 8 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px++; py++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++; py++;
								while (px < 8 && py < 8 && boardMatrix[px][py] == null) { px++; py++; }
								if (px < 8 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px < 8 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				px = this.px-1;
				py = this.py+1;
				while (px >= 0 && py < 8 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px--; py++;
				}
				if (px >= 0 && py < 8) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px--; py++;
								while (px >= 0 && py < 8 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px--; py++;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px--; py++;
								while (px >= 0 && py < 8 && boardMatrix[px][py] == null) { px--; py++; }
								if (px >= 0 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px >= 0 && py < 8 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				px = this.px+1;
				py = this.py-1;
				while (px < 8 && py >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px++; py--;
				}
				if (px < 8 && py >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px++; py--;
								while (px < 8 && py >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px++; py--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px++; py--;
								while (px < 8 && py >= 0 && boardMatrix[px][py] == null) { px++; py--; }
								if (px < 8 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px < 8 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}	
				px = this.px-1;
				py = this.py-1;
				while (px >= 0 && py >= 0 && boardMatrix[px][py] == null) {
					this.validMoves.push(px.toString() + py.toString());
					px--; py--;
				}
				if (px >= 0 && py >= 0) {
					if (boardMatrix[px][py] != null) {
						if (boardMatrix[px][py].color != this.color) {
							if (boardMatrix[px][py].type == "king") {
								Chess.inCheck = boardMatrix[px][py].color;
								Chess.attackerPos.push(this.px.toString() + this.py)
								px--; py--;
								while (px >= 0 && py >= 0 && boardMatrix[px][py] == null) {
									this.validMoves.push(px.toString() + py.toString());
									px--; py--;
								}
							}
							else {
								this.validMoves.push(px.toString() + py.toString());
								var pinX = px;
								var pinY = py;
								px--; py--;
								while (px >= 0 && py >= 0 && boardMatrix[px][py] == null) { px--; py--; }
								if (px >= 0 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].type == "king" && boardMatrix[px][py].color == boardMatrix[pinX][pinY].color) { 
									boardMatrix[pinX][pinY].pinned = true; 
								}
								else { 
									boardMatrix[pinX][pinY].pinned = false; 
								}
							}
						}
						else if (px >= 0 && py >= 0 && boardMatrix[px][py] != null && boardMatrix[px][py].color == this.color) {
							this.extendedValidMoves.push(px.toString() + py.toString());
						}
					}
				}
				break;
			case "king":
				if (this.px > 0) {
					if ((boardMatrix[this.px-1][this.py] == null || boardMatrix[this.px-1][this.py].color != this.color) && Chess.isSafeSquare(this.color, (this.px-1).toString() + this.py.toString())) {
						this.validMoves.push((this.px-1).toString() + this.py.toString()); 
					}
					if (this.py > 0) {
						if ((boardMatrix[this.px-1][this.py-1] == null || boardMatrix[this.px-1][this.py-1].color != this.color) && Chess.isSafeSquare(this.color, (this.px-1).toString() + (this.py-1).toString())) {
							this.validMoves.push((this.px-1).toString() + (this.py-1).toString());
						}
					}
					if (this.py < 7) {
						if ((boardMatrix[this.px-1][this.py+1] == null || boardMatrix[this.px-1][this.py+1].color != this.color) && Chess.isSafeSquare(this.color, (this.px-1).toString() + (this.py+1).toString())) {
							this.validMoves.push((this.px-1).toString() + (this.py+1).toString());
						}
						
					}
				}
				if (this.px < 7) {
					if ((boardMatrix[this.px+1][this.py] == null || boardMatrix[this.px+1][this.py].color != this.color) && Chess.isSafeSquare(this.color, (this.px+1).toString() + this.py.toString())) {
						this.validMoves.push((this.px+1).toString() + this.py.toString()) 
					}
					if (this.py > 0) {
						if ((boardMatrix[this.px+1][this.py-1] == null || boardMatrix[this.px+1][this.py-1].color != this.color) && Chess.isSafeSquare(this.color, (this.px+1).toString() + (this.py-1).toString())) {
							this.validMoves.push((this.px+1).toString() + (this.py-1).toString());
						}
					}
					if (this.py < 7) {
						if ((boardMatrix[this.px+1][this.py+1] == null || boardMatrix[this.px+1][this.py+1].color != this.color) && Chess.isSafeSquare(this.color, (this.px+1).toString() + (this.py+1).toString())) {
							this.validMoves.push((this.px+1).toString() + (this.py+1).toString());
						}
					}
				}
				if (this.py > 0) {
					if ((boardMatrix[this.px][this.py-1] == null || boardMatrix[this.px][this.py-1].color != this.color) && Chess.isSafeSquare(this.color, (this.px).toString() + (this.py-1).toString())) {
						this.validMoves.push((this.px).toString() + (this.py-1).toString());
					}
				}
				if (this.py < 7) {
					if ((boardMatrix[this.px][this.py+1] == null || boardMatrix[this.px][this.py+1].color != this.color) && Chess.isSafeSquare(this.color, (this.px).toString() + (this.py+1).toString())) {
						this.validMoves.push((this.px).toString() + (this.py+1).toString());
					}
				}
				if (!this.moved && Chess.inCheck != this.color) {
					var freeSquares = true;
					var py = this.py-1;
					while (py > 0) {
						if (boardMatrix[this.px][py] != null || !Chess.isSafeSquare(this.color, this.px.toString()+py)) {
							freeSquares = false;
						}
						py--;
					}
					if (freeSquares && !boardMatrix[this.px][0].moved) {
						this.validMoves.push(this.px.toString() + (this.py-2).toString());
					} 

					freeSquares = true;
					py = this.py+1;
					while (py < 7) {
						if (boardMatrix[this.px][py] != null || !Chess.isSafeSquare(this.color, this.px.toString()+py)) {
							freeSquares = false;
						}
						py++;
					}
					if (freeSquares && !boardMatrix[this.px][7].moved) {
						this.validMoves.push(this.px.toString() + (this.py+2).toString());
					}
				}
				break;
		}
		if (this.validMoves.includes(this.px.toString()+this.py)) {
			this.validMoves.splice(this.validMoves.indexOf(this.px.toString()+this.py), 1);
		}
		if (this.extendedValidMoves.includes(this.px.toString() + this.py)) {
			this.extendedValidMoves.splice(this.extendedValidMoves.indexOf(this.px.toString() + this.py), 1);
		}
	}
}


function sound(src) {
	this.audio = document.createElement("audio");
	this.audio.src = src;
	this.audio.style.display = "none";
	
	Chess.div.appendChild(this.audio);

	this.play = function() { this.audio.play(); }
}