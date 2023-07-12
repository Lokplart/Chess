import http.server
import http.cookies
import sqlite3

extentionToMIME = {
	"html" : "text/html",
	"css" : "text/css",

	"js" : "text/javascript",

	"png" : "image/png",
	"mp3" : "audio/mpeg",

	"ico" : "image/vnd.microsoft.icon"
}

nickname = None
wins = None

class RequestHandler(http.server.BaseHTTPRequestHandler):
	def do_GET(self):
		print(self.path)
		cookies = http.cookies.SimpleCookie(self.headers.get('Cookie'))

		if "nickname" not in cookies:	

			if "?nickname=" in self.path:
				self.send_response(301)
				self.send_header("Location", "/")

				global wins
				global nickname

				nickname = self.path.split("=")[-1]
				if nickname != "": 
					wins = checkForNickname(nickname)

				cookie = http.cookies.SimpleCookie()
				cookie["nickname"] = nickname
				cookie["wins"] = wins
				for morsel in cookie.values():
					self.send_header("Set-Cookie", morsel.OutputString())

				self.end_headers()
				return

			else:
				self.send_response(200)
				self.send_header("Content-type", "text/html") 
				file = open("login.html", "rb")
				self.end_headers()
				self.wfile.write(file.read())
				return

		self.send_response(200)

		if self.path == "/":

			if cookies["wins"].value != wins:
				updateNicknameWins(nickname, cookies["wins"].value)

			self.send_header("Content-type", "text/html") 
			file = open("chess.html", "rb")

		else:
			self.send_header("Content-type", extentionToMIME[self.path.split(".")[-1]]) 
			file = open(self.path[1:], "rb")

		self.end_headers()
		self.wfile.write(file.read())
		


def createDatabase():
	with sqlite3.connect("database.db") as db:
		cursor = db.cursor()

	cursor.execute('''
	CREATE TABLE IF NOT EXISTS users(
	UID INTEGER PRIMARY KEY,
	nickname VARCHAR2(20),
	wins INTEGER);
	''')

	db.commit()

def checkForNickname(nickname):
	with sqlite3.connect("database.db") as db:
		cursor = db.cursor()

	q = "SELECT * FROM users WHERE nickname = ?"
	cursor.execute(q, [(nickname)])

	result = cursor.fetchall()

	if result:
		print("found user -- ")
		print(result)
		return result[0][2]
	else:
		print("created user")
		q = "INSERT INTO users (nickname, wins) VALUES (?, 0)"
		cursor.execute(q, [(nickname)])
		db.commit()
		return 0

def updateNicknameWins(nickname, newWins):
	with sqlite3.connect("database.db") as db:
		cursor = db.cursor()

	if nickname is not None and newWins is not None:
		print("updating user " + nickname + ", " + str(newWins))
		q = "UPDATE users SET wins = ? WHERE nickname = ?"

		cursor.execute(q, [(newWins), (nickname)])

		print(cursor.fetchall())
		db.commit()

createDatabase()
server = http.server.HTTPServer(("", 80), RequestHandler)
x = server.serve_forever()
