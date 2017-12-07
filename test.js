var util = require('util');
var spawn = require('child_process').spawn;
var execFile = require('child_process').execFile;
var exec = require('child_process').exec;


var fs = require('fs');
var readline = require('readline');// 引入readline模块
var filename = 'trying.log';


var mosq = [];
var str1 = 'mosquitto -v -p 8883';
var str = 'mosquitto_sub -t fall-locate/Sensor-fe:52:df:aa:1c:6a -h 192.168.3.225 -p 8883 >>test.log';
var position_cmd='./test ';


var mosqparam = [
//		'--cafile', 'certs/rootCA.pem',
//		'--cert', 'certs/keys/certificate.pem',
//		'--key', 'certs/keys/private.key',
		'-h', '192.168.3.225',
		'-p', '8883'
	];
var logDate = new Date();//更新时间
//var postData = {//合并数据
//		datetime: logDate.toISOString(),//转化成IO流字符串
//		temperature: parseFloat(vt),//转化为浮点数
//		humidity: parseFloat(vh),//转化为浮点数
//		rssi:parseFloat(rssi)//转化为浮点数
//		TXPower:parseFloat(TXPower)//转化为浮点数
//	};
	console.log('pushAWS');
/*
	try{
	
//	exec('mosquitto_sub', mosqparam.concat('-t', 'fall-locate/Sensor-fe:52:df:aa:1c:6a'),
 exec(str1,function(error, stdout, stderr) {
                         // published
         if ( error) {
         console.error( 'stderr',  stderr);
         throw  error;
     }
     console.log( 'stdout',  stdout);
 //                      callback(false, error);
         });
exec(str, function(error, stdout, stderr) {
			// published
	if ( error) {
        console.error( 'stderr',  stderr);
        throw  error;
    }
    console.log( 'stdout',  stdout);
//			callback(false, error);
	});
		}catch (e) {//当发生错误时运行
	console.log('readdirSync: ' + e);

*/

//readkine
var logsArr = new Array();
var listenArr = new Array();
var DistanceArray = new Array();
var count=0;
function init(){
 sendHisLogs(filename, listenLogs);
}



function sendHisLogs(filename,listenLogs){

  var rl = readline.createInterface({input: fs.createReadStream(filename,{     enconding:'utf8'  }), output: null, terminal: false  /*这个参数很重要*/});

  rl.on('line', function(line) {
    if (line) {
      logsArr.push(line.toString());
    }
  }).on('close', function() {
    for(var i = 0 ;i<logsArr.length;i++){
		var temp = logsArr[i].split('\r\n'); 
		var JSONDATA = JSON.parse(temp);

                 if(  count >= 4  ){
		console.log(position_cmd.concat(DistanceArray[0],' ',DistanceArray[1],' ',DistanceArray[2],' ',DistanceArray[3],' >>position.log'));
                 exec(position_cmd.concat(DistanceArray[0],' ',DistanceArray[1],' ',DistanceArray[2],' ',DistanceArray[3],' >>position.log'),
                  function(error, stdout, stderr){
                 if(error){
                 console.log('position cmd error',stderr);
                 }
                 console.log('position ', stdout);
                 });
		//清零
		count =0;
                 for(i=0;i<4;i++)
		DistanceArray[i]=0;
                 }

                 console.log(JSONDATA.HostName);

                 switch(JSONDATA.HostName){
                 case 'raspberrypi':
                         DistanceArray[0] = JSONDATA.distance*1000;
                         console.log('dis[0]'+DistanceArray[0]);
			++count;
                         break;
                 case 'raspClient1':
                         DistanceArray[1] = JSONDATA.distance*1000;
                         console.log('dis[1]'+DistanceArray[1]);
			++count;
                         break;
                 case 'raspClient2':
                         DistanceArray[2] = JSONDATA.distance*1000;
                         console.log('dis[2]'+DistanceArray[2]);
			++count;
                         break;
                 case 'raspClient3':
                         DistanceArray[3] = JSONDATA.distance*1000;
                         console.log('dis[3]'+DistanceArray[3]);
                        ++count; 
			break;

                 default:
                         console.log('unknow data!');
                         break;

                 }

      console.log('发送历史信号: ' + logsArr[i]);
      
    }
    listenLogs(filename);
  });
}


var listenLogs = function(filePath){
  console.log('日志监听中...');
  var fileOPFlag="a+";
  
  fs.open(filePath,fileOPFlag,function(error,fd){    var buffer; var remainder = null;
    	if(error)console.log('打开失败');
	fs.watchFile(filePath,{
         persistent: true,
         interval: 1000
      },function(curr, prev){
        console.log(curr);
          if(curr.mtime>prev.mtime){
             //文件内容有变化，那么通知相应的进程可以执行相关操作。例如读物文件写入数据库等
            buffer = new Buffer(curr.size - prev.size);


            fs.read(fd,buffer,0,(curr.size - prev.size),prev.size,function(err, bytesRead, buffer){
              generateTxt(buffer.toString())
            });
          }
	  else{
             console.log('文件读取错误');
          }
         });

         function generateTxt(str){ // 处理新增内容的地方
          var temp = str.split('\r\n');
/*	  var JSONDATA = JSON.parse(temp);

		if((DistanceArray[0]!= 0) &&
		   (DistanceArray[1]!= 0) &&
		   (DistanceArray[2]!= 0) &&
		   (DistanceArray[3]!= 0) 
		){
		exec(position_cmd.concat(DistanceArray[0],DistanceArray[1],DistanceArray[2],DistanceArray[3],'>>posotion.log'),
		 function(error, stdout, stderr){
		if(error){
		console.log('position cmd error',stderr);
		}
		console.log('position ', stdout);
		});

		DistanceArray.length = 0;//清零
		}

		console.log(JSONDATA.HostName);

		switch(JSONDATA.HostName){
		case 'raspberrypi':
			DistanceArray[0] = JSONDATA.distance*1000;
			console.log('dis[0]'+DistanceArray[0]);
			break;
		case 'raspClient1':
			DistanceArray[1] = JSONDATA.distance*1000;
			console.log('dis[1]'+DistanceArray[1]);
			break;
		case 'raspClient2':
			DistanceArray[2] = JSONDATA.distance*1000;
			console.log('dis[2]'+DistanceArray[2]);
			break;
		case 'raspClient3':
			DistanceArray[3] = JSONDATA.distance*1000;
			console.log('dis[3]'+DistanceArray[3]);
			break;

		default:
			console.log('unknow data!');
			break;

		}
*/
 for(var s in temp){
            console.log(temp[s]);
          }
         }
  });
}
//function getNewLog(path){
//  console.log('做一些解析操作');
//}
init();

