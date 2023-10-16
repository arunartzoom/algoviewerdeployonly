// Importing the required modules
const WebSocketServer = require('ws');


const http = require('http');
const https = require('https');

const fs = require('fs');
const path = require('path');

const cert = fs.readFileSync('./ssl/certificate.crt');
const ca = fs.readFileSync('./ssl/ca_bundle.crt');
const key = fs.readFileSync('./ssl/private.key');

const directoryName = './public';

const types = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain'
};

const root = path.normalize(path.resolve(directoryName));

let options = {
   cert: cert, // fs.readFileSync('./ssl/example.crt');
   ca: ca, // fs.readFileSync('./ssl/example.ca-bundle');
   key: key // fs.readFileSync('./ssl/example.key');
};

/*const hostname = 'https://algoviewer.onrender.com';
const httpServer = http.createServer((req, res) => {
   res.statusCode = 301;
   res.setHeader('Location', `https://${hostname}${req.url}`);
   res.end(); // make sure to call send() or end() to send the response
});
httpServer.listen(8080);*/


// Create an HTTP server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  const extension = path.extname(req.url).slice(1);
  const type = extension ? types[extension] : types.html;
  const supportedExtension = Boolean(type);

  if (!supportedExtension) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('404: File not found');
    return;
  }

  let fileName = req.url;
  if (req.url === '/') fileName = 'index.html';
  else if (!extension) {
    try {
      fs.accessSync(path.join(root, req.url + '.html'), fs.constants.F_OK);
      fileName = req.url + '.html';
    } catch (e) {
      fileName = path.join(req.url, 'index.html');
    }
  }

  const filePath = path.join(root, fileName);
  const isPathUnderRoot = path
    .normalize(path.resolve(filePath))
    .startsWith(root);

  if (!isPathUnderRoot) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('404: File not found');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('404: File not found');
    } else {
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    }
  });
});
 
// Creating a new websocket server
const wss = new WebSocketServer.Server({ server: server })
var RemoteMachineWS = new Map();
var ControllingManineWS = new Map();

// Creating connection using websocket
wss.on("connection", ws => {
    console.log("new client connected");
    let reply = [0];
     ws.send(reply.toString());
     console.log("Sending Connection message");
    //on message from client
    ws.on("message", data => {
      try {
        //console.log(data.toString());
        let dataObj = JSON.parse(data.toString());
        let MsgType = dataObj.MsgType;
        let payload = dataObj.payload;
        switch(MsgType){
   			case 'ackRemote':{
  				console.log("Remote Machine ACK Message Received");
  				let randomUniqueNo = 1234;//Math.floor((Math.random() * 10000) + 1000);
  				let ackReply = [5,randomUniqueNo];
  				ws.send(ackReply.toString());
  			break;
  			}
        case 'ackController':{
          console.log("Controller  Machine ACK Message Received");
          var tocken = payload.tocken;
          var RemoteMachineWSObj = RemoteMachineWS.get(tocken);
          if(RemoteMachineWSObj){
            let ackReply = [6, tocken];
            RemoteMachineWSObj.session.send(ackReply.toString());
            ControllingManineWS.get(tocken).session.send("{\"MsgType\":\"remote_res\",\"payload\":"+JSON.stringify(RemoteMachineWSObj.res)+"}");
            console.log("Sending resolution message to controlling machine"+JSON.stringify(RemoteMachineWSObj.res));
            //ws.send("{\"MsgType\":\"success\",\"payload\":\"Session Success\"}");
          }else{
            ws.send("{\"MsgType\":\"error\",\"payload\":\"Session Not found\"}");
          }
         break;
        }
        case 'connectRemote':{
                console.log("connectRemote===================>>>  Message Received :"+JSON.stringify(payload));
                var tocken = payload.tocken;
        				var clientType = payload.ClientType;
        				var RemoteMachineWSObj = RemoteMachineWS.get(tocken);
                if (RemoteMachineWSObj == null && payload.ClientType == "RemoteMachine") {
                    RemoteMachineWS.set(tocken, {"session":ws,"res":payload.res});
					          console.log("RemoteMachineWS connected and set : "+RemoteMachineWS.res.toString());
                }
            break;
            }
        case 'connectController':{
                console.log("connectController<<<<===================  Message Received :"+JSON.stringify(payload));
                var tocken = payload.tocken;
        				var clientType = payload.ClientType;
        				var ControllingManineWSObj = ControllingManineWS.get(tocken);
                if(ControllingManineWSObj == null && payload.ClientType == "ControllingMachine"){
                    ControllingManineWS.set(tocken, {"session":ws});
					          console.log("ControllingManineWS connected and set : "+tocken); 
                }
            break;
          }
        case 'mouseup':{
                //console.log("mouseevent Message Received :"+payload.toString());
                var tocken = payload.tocken;
                let data = [7,payload.data.x, payload.data.y,payload.data.btn]
                RemoteMachineWS.get(tocken).session.send(data.toString());
            break;
            }
		case 'mousedown':{
                //console.log("mouseevent Message Received :"+payload.toString());
                var tocken = payload.tocken;
                let data = [8,payload.data.x, payload.data.y,payload.data.btn]
                RemoteMachineWS.get(tocken).session.send(data.toString());
            break;
            }
		case 'mousemove':{
                //console.log("mouseevent Message Received :"+payload.toString());
                var tocken = payload.tocken;
                let data = [9,payload.data.x, payload.data.y]
                RemoteMachineWS.get(tocken).session.send(data.toString());
            break;
            }
        case 'keydownevent':{
                //console.log("keyevent Message Received :"+payload.toString());
                var tocken = payload.tocken;
                var keyData = [2,payload.data.e]
                RemoteMachineWS.get(tocken).session.send(keyData.toString());
            break;
            }
        case 'keyupevent':
                //console.log("keyevent Message Received :"+payload.toString());
                var tocken = payload.tocken;
                var keyData = [3,payload.data.e]
                RemoteMachineWS.get(tocken).session.send(keyData.toString());
            break;
        case 'scrollevent':
                //console.log("keyevent Message Received :"+payload.toString());
                var tocken = payload.tocken;
                var keyData = [4,payload.data.e,payload.data.y]
                RemoteMachineWS.get(tocken).session.send(keyData.toString());
            break;
        case 'capture':
                //console.log("capture Message Received :"+payload.diffIndex);
               var tocken = payload.tocken;
               var ControllingManineWSObj = ControllingManineWS.get(tocken);
               if(ControllingManineWSObj){
                //ControllingManineWSObj.session.send("{\"MsgType\":\"capture\",\"payload\":\""+payload.data+"\"}");
                var sendObj= {"MsgType":"capture","payload":{"data":payload.data,"diffIndex":payload.diffIndex}}
                ControllingManineWSObj.session.send(JSON.stringify(sendObj));
                //console.log("capture Message transfered to controlling manhine");
               }
            break;
            
            
        }
      } catch (e) {
        console.log("Excption while handling message in WS"+e);
      }
    }); 
 
    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log("the client has disconnected");
    });
    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});
console.log("The WebSocket server is running on port 80");

// Start the server on port 80
server.listen(80, () => {
  console.log('Server is listening on port 80');
});

