var http = require('http');
var fs = require('fs');
var url = require('url');

//-----------------------------
var readline = require('readline');
var responseData="";
var addrinfo = new Array();
var logsArr = new Array();
var t;
var T;
function ReadHisLogs(filename, listenLogs){
	var r1 = readline.createInterface({input: fs.createReadStream(filename,
	{ enconding:'utf8'  }), output: null, terminal: false});
	r1.on('line', function(line){
	if(line){
	logsArr.push(line.toString());
	}
	}).on('close', function(){
	for(var i=0;i<logsArr.length;i++){
		responseData = logsArr[i].split('\r\n');
		var JSONDATA = JSON.parse(responseData);
                for( t=0;t<addrinfo.length;t++)
		{
			if(addrinfo[t].addr==JSONDATA.addr)
			{
			//console.log('t %d l %d',t,addrinfo.length);
			console.log('%s匹配到数组%d',JSONDATA.addr,t);
			addrinfo[t]=JSONDATA;
			break;
			}

			if(t == (addrinfo.length-1))
	                {
			// console.log('t %d l %d',t,addrinfo.length);
	                addrinfo[addrinfo.length]=JSONDATA;
	                console.log('%s新建数组%d',JSONDATA.addr,addrinfo.length-1);
			break;
	                }

		}
		if((t==0) && (addrinfo.length==0) )
                {
                addrinfo[t]=JSONDATA;
                console.log('%s初始化新建数组%d',JSONDATA.addr,t);
                }
	}
       listenLogs(filename);
});
}


function listenLogs(filePath){
	console.log('等待本地位置数据更新...');
	var fileOPFlag = "a+";

	fs.open(filePath,fileOPFlag,function(error,fd){ var buffer; var remainder = null;
		if(error) console.log('打开失败');
		fs.watchFile(filePath,{
		persistent: true,
		interval: 1000
		},function(curr, prev){
		console.log(curr);

		if(curr.mtime>prev.mtime){
		buffer = new Buffer(curr.size - prev.size);
			fs.read(fd, buffer, 0,(curr.size - prev.size),prev.size,function(err, bytesRead, buffer){
			responseData=buffer.toString().split('\r\n') ;
			var JSONDATA= JSON.parse(responseData);
                 	for( t=0;t<addrinfo.length;t++)
	                {
                         if(addrinfo[t].addr==JSONDATA.addr)
                          {
                      //    console.log('t %d l %d',t,addrinfo.length);
                          console.log('%s匹配到数组%d',JSONDATA.addr,t);
                          addrinfo[t]=JSONDATA;
                          break;
                          }

                          if(t == (addrinfo.length-1))
                          {
                    //      console.log('t %d l %d',t,addrinfo.length);
                          addrinfo[addrinfo.length]=JSONDATA;
                          console.log('%s新建数组%d',JSONDATA.addr,addrinfo.length-1);
                          break;
                          }

	                }
        	        if((t==0) && (addrinfo.length==0) )
                	{
                  	  addrinfo[t]=JSONDATA;
                  	  console.log('%s初始化新建数组%d',JSONDATA.addr,t);
                	}

			});
		}
		else{ console.log('文件读取错误');};
		})
	});
}

var filename = 'position.txt';
ReadHisLogs(filename,listenLogs);
// 创建服务器
http.createServer( function (request, response) {
   // 解析请求，包括文件名
   var pathname = url.parse(request.url).pathname;
    console.log(request.url);
   // 输出请求的文件名
   console.log("收到请求设备号：" + pathname + " 数据...");

   for(T=0;T<addrinfo.length;T++)
   {
	console.log('length:'+addrinfo.length);
	if('/'+addrinfo[T].addr==pathname)
	{
	console.log('/'+addrinfo[T].addr);
	data=JSON.stringify( addrinfo[T], null, 4);
	console.log('服务器找到本地设备\''+pathname+'\'数据');
	response.writeHead(200, {"Content-Type": "text/html","Access-Control-Allow-Origin":"*"});
	response.write(data);
	response.end();
	console.log('发送数据：'+data);
	break;
	}
	 else if(T==(addrinfo.length-1))
        {
         console.log('！：服务器本地找不到设备\''+pathname+'\'数据');
         response.writeHead(404, {"Content-Type": "text/html","Access-Control-Allow-Origin":"*" });
         response.end();
        }
   }

   // 从文件系统中读取请求的文件内容
   //fs.readFile(pathname.substr(1), function (err, data) {
   //   if (err) {
   //      console.log(err);
   //      response.writeHead(404, {"Content-Type": "text/html","Access-Control-Allow-Origin":"*" });
   //   }
   //   else{
   //      response.writeHead(200, {"Content-Type": "text/html","Access-Control-Allow-Origin":"*"});
   // 响应文件内容
   //      response.write(data.toString());
   //	console.log(data.toString());
   //   }
   //  发送响应数据
   //   response.end();
   //});
}).listen(9000);

// 控制台会输出以下信息
console.log('Server running at http://127.0.0.1:9000/');


