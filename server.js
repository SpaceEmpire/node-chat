const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

let cache = {};

function send404(response) {
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('Error 404：resource not found');
  response.end();
}

function sendFile(response, filePath, fileContents) {
  response.writeHead(200, {'content-type': mime.lookup(path.basename(filePath))});
  response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
  if (cache[absPath]) {//检查文件是否缓存在内存中
    sendFile(response, absPath, cache[absPath]);
  } else {
    fs.exists(absPath, function (exists) {//检查文件是否存在
      if (exists) {
        fs.readFile(absPath, function (err, data) {//从硬盘中读取文件
          if (err) {
            send404(response);
          } else {
            cache[absPath] = data;
            sendFile(response, absPath, data);//从硬盘中读取文件并返回
          }
        });
      } else {
        send404(response);
      }
    });
  }
}

const server = http.createServer(function (request, response) {
  let filePath = false;
  if (request.url == '/') {
    filePath = 'public/index.html';
  } else {
    filePath = 'public' + request.url;
  }
  let absPath = './' + filePath;
  console.log(absPath);
  serveStatic(response, cache, absPath);
});

server.listen(3000,function(){
  console.log('Server listen on port 3000');
});