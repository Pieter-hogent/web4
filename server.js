let connect = require("connect");
let serveStatic = require("serve-static");
let serveDir = __dirname + "/";
connect()
  .use(serveStatic(serveDir))
  .listen(8080, function() {
    console.log("Server running on http://localhost:8080/ ");
  });
