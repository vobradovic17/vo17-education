const http = require("http");
const port = 3000;

http.createServer(function (req, res) {
	res.write("Hello World!");
	res.end();
}).listen(port);

console.log(`Server started on port ${port}`);
