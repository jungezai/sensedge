
var os = require('os');
var noble = require('noble');
var nodemailer = require('nodemailer');
var ip = require('ip');
var mqsh = require('./mqpubsub.js');
var mysql = require('mysql');



//Router-master
var util = require('util');
var exec_mosq = require('child_process').exec;
var fs = require('fs');
var readline = require('readline');
var filename = 'MQTTdistanceData.log';//mqtt sub's data
var positionlogname = 'position.log'
var port = '8883';
var hostip;
var tag = 'fall-locate';
var position_comand = './CalculatePosition ';
var mosq_cmd = '';
var mosq_sub_cmd = '';
var mosq_pub_cmd = '';
var areax=3;//set position area to calculate
var areay=3;//
var A = 70;
var n = 2.1;
// Constant
const TYPE_DIAPERSENS =	1
const TYPE_FALLSENS   = 2
// SMS Phonebook
const u1_carrier = 'AT&T';
const u1_number = '1234567';
const u2_carrier = 'Verizon';
const u2_number = '1234567';
const u3_carrier = 'T-Mobile';
const u3_number = '1234567';

const phoneBook = {
	'Yi':		{ 'carrier': 'T-Mobile', 'number': '4083178351' },
	'Li':		{ 'carrier': 'Verizon',  'number': '2082720078' },
	'George':	{ 'carrier': 'Verizon',  'number': '5105661442' },
	'1':		{ 'carrier': u1_carrier, 'number': u1_number    },
	'2':		{ 'carrier': u2_carrier, 'number': u2_number    },
	'3':		{ 'carrier': u3_carrier, 'number': u3_number    },
};
const monitorTable = {
	'e6:d7:22:59:ed:ed' : [ phoneBook['Li'], phoneBook['Yi'] ],
	'fc:a1:c8:c2:b4:af' : [ phoneBook['Li'], phoneBook['Yi'] ],
	'd7:9a:ae:73:3b:94' : [ phoneBook['Li'], phoneBook['Yi'] ],
	'fe:2f:47:bd:a0:f9' : [ phoneBook['Li'], phoneBook['Yi'] ],
	'e4:d9:80:62:26:e6' : [ phoneBook['Li'], phoneBook['Yi'] ],
	'f7:b7:2a:a1:da:b6' : [ phoneBook['Li'], phoneBook['Yi'] ],
};

// DiaperSens Constant
const RH_THRESHOLD = 80
// DiaperSens Detection Algorithm
const ALGO_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ALGO_TEMPRAMP_MS = 2 * 60 * 1000; // 2 minutes
const ALGO_TEMPRAMP_VALUE = 0.5; // 0.5 Celsius

// FallSens Constant
const GRAVITY = 9.8;
const FALL_THRESHOLD = 24.5;
const CALIBRATE_COUNT = 300;

var gConfig = { 'bootNotification': {
			'enable': false,
			'os': 'linux',
			'uptime': 60,
			'recipient': phoneBook['Li']
		},
		'smsNotification': false,
		'cloudUpdate': true,
		'useAlgorithm': false,
		'localDBUpdate': false,
		'dbHost': 'kittycat9.local',
		'dbPasswd': 'ElderSens123',
};
var gDevices = {};
var gResetting = false;
var gState;
var gCalibrate = true;
var gCalibrateDevice = null;

// FallSens device Calibration Table
const calibrationTable = {
	// Mac Address,	    Axis X,	  Y,	   Z	    SVM Threshold
	'e6:d7:22:59:ed:ed' : [  3.0097,  0.3852,  2.0977,  15.5 ],
	'fc:a1:c8:c2:b4:af' : [  18.6608, 3.4489,  2.8866,  20.5 ],
	'd7:9a:ae:73:3b:94' : [  6.5987,  3.8231,  1.1636,  24.5 ],
};

// Function libraries
function Device(peripheral) {
	this.peripheral		= peripheral;
	this.type		= 0;
	// DiaperSens
	this.temperature	= 0;
	this.humidity		= 0;
	// DiaperSens detection algorithm related
	this.state		= 'STATE_INIT';
	this.rh_start		= 0;
	this.records		= [];
	// FallSens
	this.acc_triggered	= false;
	this.acc_buffer		= [];
	this.nsample		= 0;
	this.calib_axis		= [ 0, 0, 0 ];
	// Common
	this.rssi		= peripheral.rssi;
	this.enabled		= false;
	this.notified		= false;
	this.connecting		= false;
	this.tsconn		= (new Date()).getTime();
        //
	this.TXPower		= peripheral.advertisement.txPowerLevel;
}

var device_addr;
var hostcmd = 'sudo nmblookup raspberrypi';
var disFlag = new Array();
var logsArr = new Array();
var listenArr = new Array();
var DistanceArray = new Array();
for(var i=0;i<4;i++) disFlag[i]=0;
var discount=0;
//var EmptyDeystr='{ "addr":"","count":0,"distance":{"0":0,"1":0,"2":0,"3":0 } }';
var EmptyDevjson=JSON.parse('{"addr":"","count":0,"datetime":"","distance":{"raspberrypi":0,"raspClient1":0,"raspClient2":0,"raspClient3":0 } }');
var DevInfo=new Array();
//open mosquitto and mosquitto_sub

try{
	exec_mosq(hostcmd, function(error, stdout, stderr){
	if(error){
		console.error('hostcmd',stderr);
		throw error;
	}
	else{
		console.log('stdout--host', stdout);
		stdout = stdout.split(' ');
		hostip = stdout[0];
		console.log('master router hostip:',hostip);
//master Router operate
	if(os.hostname == 'raspberrypi'){
//open mqtt
		console.log(mosq_cmd.concat('mosquitto ','-v -p ',port));
		exec_mosq(mosq_cmd.concat('mosquitto -v -p ',port), function(error, stdout, stderr){
			if(error){
			console.error('mosq stderr', stderr);
//			throw error;
			}
		console.log('stdout', stdout);
		});
//open mqtt sub
		console.log('mqttsub--cmd--:',mosq_sub_cmd.concat('mosquitto_sub',' -h ',hostip,' -p ',port,' -t ',tag,' >>'+filename));
		exec_mosq(mosq_sub_cmd.concat('mosquitto_sub',' -h ',hostip,' -p ',port,' -t ',tag,' >>'+filename), function(error, stdout, stderr){
			if(error){
			console.error('mosq sub stderr', stderr);
//			throw error;
			}
		console.log('stdout', stdout);
		});
		init();
	}
	} });
	}catch(e){
	console.log('readdirSync:'+e);
}

function init(){
	ReadHisLogs(filename, listenLogs);
}


function ReadHisLogs(filename, listenLogs){
	var r1 = readline.createInterface({input: fs.createReadStream(filename,{  enconding:'utf8'   }), output: null, terminal:false});
	r1.on('line', function(line){
	if (line) {
	logsArr.push(line.toString());
	}
	}).on('close', function() {
	for(var i=0;i<logsArr.length;i++){
		var temp = logsArr[i].split('\r\n');
		var JSONDATA = JSON.parse(temp);
		device_addr = JSONDATA.addr;
//		console.log(JSONDATA.HostName);
	console.log('读取数据：' + logsArr[i]);
		for( var j=0;j<DevInfo.length;j++)
		{

			if(DevInfo[j].addr==JSONDATA.addr)
			{
			console.log('更新设备:'+JSONDATA.addr+'信息：'+temp);
			DealdisData(JSONDATA,j);
			break;
			}
			else if(j==DevInfo.length-1)
			{
			console.log('创建新设备:'+JSONDATA.addr+'信息：'+temp);
//			console.log('befor '+DevInfo.length);
			DevInfo[DevInfo.length]=  EmptyDevjson;
//			console.log('after '+DevInfo.length);
 	                DevInfo[DevInfo.length-1].addr=JSONDATA.addr;
 	                DealdisData(JSONDATA,DevInfo.length-1);

			}

		}
		if(j==0&&DevInfo.length==0)
		{
		console.log('初始化创建新设备:'+JSONDATA.addr+'信息：'+temp);
		DevInfo[0]=  EmptyDevjson;
		DevInfo[0].addr=JSONDATA.addr;
		DealdisData(JSONDATA,0);
		}
	}
	listenLogs(filename);
	});
}

 function DealdisData(json, num)
{
  switch(json.HostName)
  {
   case 'raspberrypi':
	if(DevInfo[num].distance.raspberrypi == 0) ++DevInfo[num].count;
	DevInfo[num].distance.raspberrypi =json.distance;
	console.log('更新raspberrypi：'+DevInfo[num].distance.raspberrypi+'count'+DevInfo[num].count);
	break;
   case 'raspClient1':
	if(DevInfo[num].distance.raspClient1 == 0)  ++DevInfo[num].count;
        DevInfo[num].distance.raspClient1 =json.distance;
        console.log('更新raspClient1：'+DevInfo[num].distance.raspClient1+'count'+DevInfo[num].count);
        break;
   case 'raspClient2':
        if(DevInfo[num].distance.raspClient2 == 0)  ++DevInfo[num].count;
        DevInfo[num].distance.raspClient2 =json.distance;
        console.log('更新raspClient2：'+DevInfo[num].distance.raspClient2+'count'+DevInfo[num].count);
        break;
   case 'raspClient3':
        if(DevInfo[num].distance.raspClient3 == 0)  ++DevInfo[num].count;
        DevInfo[num].distance.raspClient3 =json.distance;
        console.log('更新raspClient3：'+DevInfo[num].distance.raspClient3+'count'+DevInfo[num].count);
        break;
	default:
	console.log('error: unknow distance jsondata');

  }

	if(DevInfo[num].count>=4)
	{
	DevInfo[num].datetime = json.datetime;
	console.log('调用位置算法'+position_comand.concat(DevInfo[num].datetime,' ',DevInfo[num].addr,' ',areax,' ',areay,' ',DevInfo[num].distance.raspberrypi*1000,' ',DevInfo[num].distance.raspClient1*1000,' ',DevInfo[num].distance.raspClient2*1000,' ',DevInfo[num].distance.raspClient3*1000, ' >>'+positionlogname));
        exec_mosq(position_comand.concat(DevInfo[num].datetime,' ',DevInfo[num].addr,' ',areax,' ',areay,' ',DevInfo[num].distance.raspberrypi*1000,' ',DevInfo[num].distance.raspClient1*1000,' ',DevInfo[num].distance.raspClient2*1000,' ',DevInfo[num].distance.raspClient3*1000,' >>'+positionlogname),
        function(error, stdout, stderr){
        if(error)console.log('positon cmd error');
        console.log('positon stdout',stdout);
        });

      //清零
	DevInfo[num].count=0;
	DevInfo[num].distance.raspberrypi=0;
	DevInfo[num].distance.raspClient1=0;
 	DevInfo[num].distance.raspClient2=0;
 	DevInfo[num].distance.raspClient3=0;
	}

}

 function listenLogs(filePath){
	console.log('MQTT DATA日志监听中...');
	var fileOPFlag = "a+";

	fs.open(filePath,fileOPFlag,function(error,fd){	var buffer; var remainder = null;
		if(error)console.log('打开失败');
		fs.watchFile(filePath,{
		persistent: true,
		interval: 1000
		},function(curr, prev){
		console.log(curr);
		if(curr.mtime>prev.mtime){
		console.log('文件数据变化');
		buffer = new Buffer(curr.size - prev.size);

		fs.read(fd, buffer, 0,(curr.size - prev.size),prev.size,function(err, bytesRead, buffer){
			generateTxt(buffer.toString())
		});
		}
		else{ console.log('文件读取错误');}
	})

	function generateTxt(str){
	var i;
	var temp = str.split('\n');
//for(var x=0;x<temp.length;x++){console.log('第%d -- %s',x,temp[x]);}
	temp=temp[0];
//console.log('templength %d,在线json转换之前:%s oooo',temp.length,temp);
	var JSONDATA = JSON.parse(temp);
//console.log('在线json转换之后');

//         console.log(JSONDATA.HostName);

	for( i=0;i<DevInfo.length;i++)
	 {
        	 if(DevInfo[i].addr==JSONDATA.addr)
         	{
		console.log('更新设备:'+JSONDATA.addr+'信息：'+temp);
         	DealdisData(JSONDATA,i);
         	break;
        	 }
		else if(i==DevInfo.length-1)
		{
                console.log('创建新设备:'+JSONDATA.addr+'信息：'+temp);
                console.log('befor '+DevInfo.length);
                DevInfo[DevInfo.length]=  EmptyDevjson;
                console.log('after '+DevInfo.length);
                DevInfo[DevInfo.length-1].addr=JSONDATA.addr;
                DealdisData(JSONDATA,DevInfo.length-1);
		}
 	}
 	if(i==0&&DevInfo.length==0)
 	{
	 console.log('初始化创建新设备:'+JSONDATA.addr+'信息：'+temp);
         DevInfo[0]=  EmptyDevjson;
         DevInfo[0].addr=JSONDATA.addr;
         DealdisData(JSONDATA,0);
 	}


	}
	});
}


function doNotification(dev) {
	if (gConfig['useAlgorithm']) {
		algo_detection(dev);
	} else {
		if (dev['humidity'] >= RH_THRESHOLD) {
			if (!dev['notified']) {
				dev['notified'] = true;
				sendNotification(dev);
			}
		} else {
			dev['notified'] = false;
		}
	}
}

function detectFall(addr, buf) {
	var t0 = buf[0]['ts'];
	console.log("Dump", addr, "samples since", new Date(t0).toLocaleString());
	var sum = [ 0, 0, 0 ];
	var count = 0;
	var fall = false;
	for (var i = 0; i < buf.length; i++) {
		var entry = buf[i];
		console.log("\tTS", entry['ts'] - t0, "SVM", entry['svm'].toFixed(2),
			    "XYZ {", entry['axis'][0].toFixed(2),
			    entry['axis'][1].toFixed(2),
			    entry['axis'][2].toFixed(2), "}");
		if (entry['ts'] - t0 >= 400) {
			count++;
			for (var j = 0; j < 3; j++) {
				sum[j] += entry['axis'][j];
			}
		}
	}
	if (count > 0) {
		if ((Math.abs(sum[0] / count) > 5 || Math.abs(sum[2] / count) > 5) &&
		    Math.abs(sum[1] / count) < 5) {
			fall = true;
		}
		console.log(addr, ": AvgX", (sum[0] / count).toFixed(2),
			    ", AvgY", (sum[1] / count).toFixed(2),
			    ", AvgZ", (sum[2] / count).toFixed(2),
			    ", count", count, ", fall", fall);
	}
	return fall;
}

function sendBootNotification() {
	var bn = gConfig['bootNotification'];

	if (bn['enable'] && os.platform() == bn['os'] && os.uptime() < bn['uptime']) {
		// Notify only once
		bn['enable'] = false;
		SendSMS(bn['recipient'], 'host ' + os.hostname() + ' booted',
			'Date: ' + new Date() + '\nUptime: ' + os.uptime() +
			's\nIP: ' + ip.address() + '\nSensor: ' + addr,
			function(error) {
				if (error) {
					console.log('\tSend Boot SMS failed: ' + error);
				} else {
					console.log('\tSend Boot SMS successfully');
				}
		});
	}
}

function processDiaperSens(addr, dev, data) {
	var len = data.readUInt8(0);
	var flag = data.readUInt8(1);
	var checksum = data.readUInt8(len);
	var cs = 0;

	for (var i = 0; i < len; i++) {
		cs ^= data.readUInt8(i);
	}
	if (cs != checksum) {
		console.log('\tInvalid checksum ' + cs + ' for frame ' + data.toString('hex'));
		return;
	}
	switch (flag) {
	case 1:
		var temperature = (data.readInt16BE(2) / 10.0).toFixed(1);
		var humidity = (data.readInt16BE(4) / 10.0).toFixed(1);
		dev['temperature'] = temperature;
		dev['humidity'] = humidity;
		break;
	case 2:
		var unused_value = data.readInt8(2);
		return;
	}
}

function processFallSens(addr, dev, data) {
	var entry = {};
	var fallUpdate = false;
	var rssi;
	var txp;
	var dis;
	var count;
	entry['axis'] = [];
	// data format: flag (1) X Y Z (each 4, IEEE 11073 float LE)
	//console.log('buf ' + data.toString('hex'));
	for (var i = 0; i < 3; i++) {
		var ndata = data.slice(i * 4 + 1, i * 4 + 5);
		var man = ndata.readIntLE(0, 2);
		var exp = ndata.readInt8(3);
		var val = man * Math.pow(10, exp);
		entry['axis'][i] = val;
		if (calibrationTable[addr]) {
			entry['axis'][i] += calibrationTable[addr][i];
		}
	}
	dev['nsample']++;
	dev['humidity'] = 0;
	// Update non-fall event to cloud every 30s (600*50ms)
	if (dev['nsample'] % 600 == 0) {
		fallUpdate = true;
	}
	// Calibration Path
	if (gCalibrate) {
		for (var i = 0; i < 3; i++) {
			dev['calib_axis'][i] += entry['axis'][i];
		}

                rssi = dev['rssi'];
		txp = dev['TXPower'];
		dis = processDistance(rssi, txp);

			pushRouter(addr, 0, 0, rssi, txp, function(err){
			if(err) console.log('pushAWS err-----------');
			});
                count = 0;

		console.log('FallSens', addr, 'calibrating', dev['nsample'],
			   // ': X =', (0 - dev['calib_axis'][0] / dev['nsample']).toFixed(4),
			   // ', Y =', (GRAVITY - dev['calib_axis'][1] / dev['nsample']).toFixed(4),
			   // ', Z =', (0 - dev['calib_axis'][2] / dev['nsample']).toFixed(4)
			    ',rssi',rssi,
			    ',TXPower',txp,
			    ',distance',dis
				);
		if (dev['nsample'] == CALIBRATE_COUNT) {
			console.log('Calibration Finished. Append below line to calibrationTable:');
			console.log("'" + addr + "' : [",
				    (0 - dev['calib_axis'][0] / dev['nsample']).toFixed(4) + ", ",
				    (GRAVITY - dev['calib_axis'][1] / dev['nsample']).toFixed(4) + ", ",
				    (0 - dev['calib_axis'][2] / dev['nsample']).toFixed(4) + ", ",
				    FALL_THRESHOLD, "],");
			disconnect(function() {
				process.exit(0);
			});
		}
		return false;
	}
	// Fall Detection Path
	var now = new Date().getTime();
	entry['ts'] = now;
	entry['svm'] = Math.sqrt(Math.pow(entry['axis'][0], 2) +
				 Math.pow(entry['axis'][1], 2) +
				 Math.pow(entry['axis'][2], 2));
	//console.log('\t', addr + ' RSSI:' + dev['rssi'], 'FallSens', entry);
	var fallThreshold = FALL_THRESHOLD;
	if (calibrationTable[addr]) {
		fallThreshold = calibrationTable[addr][3];
	}
	if (dev['acc_triggered']) {
		dev['acc_buffer'].push(entry);
	} else if (entry['svm'] >= fallThreshold) {
		dev['acc_triggered'] = true;
		dev['acc_buffer'] = [ entry ];
	}
	if (dev['acc_triggered'] && (now - dev['acc_buffer'][0]['ts'] > 500)) {
		dev['acc_triggered'] = false;
		if (detectFall(addr, dev['acc_buffer'])) {
			dev['humidity'] = 100;
			dev['nsample'] = 0;
			fallUpdate = true;
		}
	}
	return fallUpdate;
}

function processDistance(rssi, txpower){
	if(rssi == 0) return -1;
	var iRssi = Math.abs(rssi);
	var power = (iRssi-A)/(10*n);
	return (Math.pow(10,power)).toFixed(4);

}

function processSensorData(addr, data) {
	var dev = gDevices[addr];
	var sensorUpdate = false;
	var logstr = '';
	var sensorMsg = '';

	// Send boot notification on Raspberry Pi
	sendBootNotification();

	if (dev['type'] == TYPE_DIAPERSENS) {
		processDiaperSens(addr, dev, data);
		sensorUpdate = true;
		sensorMsg = 'temperature ' + dev['temperature'] + ' C humidity ' + dev['humidity'] + ' %';
	} else if (dev['type'] == TYPE_FALLSENS) {
		sensorUpdate = processFallSens(addr, dev, data);
		sensorMsg = ', Fall detected: ' + (dev['humidity'] == 0 ? "No" : "Yes");
	}

	if (gConfig['cloudUpdate'] && sensorUpdate) {
		pushAWS(addr, dev['temperature'], dev['humidity'], function(shadow, err) {
			logstr = ' cloudUpdate ';
			if (err)
				logstr += 'failed';
			else
				logstr += 'success';

			// Ignore shadow result
			if (shadow)
				return;
		});
	}
	if (gConfig['localDBUpdate'] && sensorUpdate) {
		pushLocalDB(addr, dev['temperature'], dev['humidity'], function(err) {
			logstr = ' localDBUpdate';
			if (err)
				logstr += 'failed';
			else
				logstr += 'success';
		});
	}
	if (sensorUpdate) {
		console.log('\t', addr + ' RSSI:' + dev['rssi'], sensorMsg + logstr);
		doNotification(dev);
	}
}

function sendNotification(dev) {
	// Send notification
	var addr = dev['peripheral'].address;
	var subject;
	var body;

	if (dev['type'] == TYPE_DIAPERSENS) {
		subject = 'DiaperSens ' + addr + ' needs your attention';
		body = 'Humidity: ' + dev['humidity'] + ' %\nTemperature: ' +
			dev['temperature'] + ' \u00B0C\n';
	} else if (dev['type'] == TYPE_FALLSENS) {
		subject = 'FallSens ' + addr + ' needs your attention';
		body = 'Fall detected for user ' + addr;
	}

	if (!gConfig['smsNotification'])
		return;

	for (var i in monitorTable[addr]) {
		var phoneInfo = monitorTable[addr][i];
		SendSMS(phoneInfo, subject, body, function(err) {
			if (err) {
				console.log('\t\tSend SMS to ' + this.number +
					' failed: ' + err);
			} else {
				console.log('\t\tSend SMS to ' + this.number +
					' successfully');
			}
		}.bind( {number:phoneInfo['number']} ));
	}
}

function algo_detection(dev) {
	var now = new Date();
	if (dev['state'] == 'STATE_INIT') {
		if (dev['humidity'] >= RH_THRESHOLD) {
			dev['rh_start'] = now;
			dev['state'] = 'STATE_HUMIDITY_DETECTED';
		}
	} else if (dev['state'] == 'STATE_HUMIDITY_DETECTED') {
		if (now.getTime() > new Date(dev['rh_start'].getTime() + ALGO_COOLDOWN_MS).getTime()) {
			dev['records'] = [];
			dev['state'] = 'STATE_TEMP_DETECTING';
		}
	} else if (dev['state'] == 'STATE_TEMP_DETECTING') {
		for (var i in dev['records']) {
			// keep only 1 minutes records
			if (now.getTime() > new Date(dev['records'][i]['timestamp'].getTime() + ALGO_TEMPRAMP_MS).getTime())
				dev['records'].splice(i, 1);
			else
				break;
		}
		var min = Math.min.apply(Math, dev['records'].map(function(r) {
				return r.temperature;
		}));
		if (dev['temperature'] <= min + ALGO_TEMPRAMP_VALUE) {
			dev['records'].push({'timestamp': now,
					     'temperature': dev['temperature'],
					     'humidity': dev['humidity']});
			return;
		}
		// Detected
		if (dev['notified'])
			return;

		// Send notification
		sendNotification(dev);

		dev['state'] = 'STATE_INIT';
		dev['notified'] = false;
		dev['records'] = [];
	}
}

function disconnect(callback) {
	for (addr in gDevices) {
		gDevices[addr]['enabled'] = false;
		gDevices[addr]['peripheral'].disconnect(function() {
			console.log('Disconnected from peripheral: ' + addr + ' (RSSI: ' + gDevices[addr]['rssi'] + ') on ' + new Date());
		});
	}
	setTimeout(callback, 1000);
}

function execCmd(line, callback)
{
	var execFile = require('child_process').execFile;
	var l = line.trim();
	var cmd = l;
	var args = '';
	var space = l.indexOf(' ');
	if (space > 0) {
		cmd = l.substr(0, space);
		args = l.substr(space + 1);
	}
	switch(cmd) {
	case 'exit':
		process.exit(0);
	default:
		//console.log('> ' + cmd, args);
		var arglist = undefined;
		if (args != '') {
			arglist = args.split(' ');
		}
		execFile(cmd, arglist, function(err, stdout, stderr) {
			var output;
			if (err) {
				callback(err, stderr);
				output = err + stderr;
			} else {
				callback(err, stdout);
				output = stdout;
			}
			mqsh.output_pub(os.hostname(), output, function(){});
		});
		break;
	}
}

function bleScan()
{
	if (gState === 'poweredOn' && !gResetting)
		noble.startScanning();
}

function hciReset()
{
	var exec = require('child_process').exec;

	gResetting = true;
	exec('hciconfig hci0 reset', function callback(err, stdout, stderr){
		// result
		//console.log("hci0 reset", err ? "fail" : "success");
		gResetting = false;
	});
}


var count = 0;  //计数
var sumrssi = 0;//rssi之和
function pushRouter(addr, vt, vh, rssi, txpower, callback){
	var util = require('util');
	var os = require('os');
	var spawn = require('child_process').spawn;
	var execFile = require('child_process').execFile;
	var mosqparam = [
		//'--cafile', 'certs/rootCA.pem',
		//'--cert', 'certs/keys/certificate.pem',
		//'--key', 'certs/keys/private.key',
		'-h', hostip,
		'-p', port
	];
 var logDate = new Date();
 var distance = processDistance(sumrssi/count, txpower);

	count++;
        sumrssi+=rssi;
	console.log('count'+count,'sumrssi'+sumrssi,'hostname'+os.hostname,'distance'+distance);
	if(count>9){
	console.log('push to MasterRouter...');


	var postData = {
		datetime: logDate.toISOString(),
		HostName: os.hostname(),
		addr:addr,
//		temperature: parseFloat(vt),
//		humidity: parseFloat(vh),
		Rssi: rssi,
		TXPower: txpower,
		distance: parseFloat(distance)
	};
	console.log("pushRouterData", postData,'\r\njson--', JSON.stringify(postData));
        console.log('MQTTpub--cmd:', 'mosquitto_pub',mosqparam.concat('-t', tag, '-m', JSON.stringify(postData)) );
	execFile( 'mosquitto_pub', mosqparam.concat('-t', tag, '-m', JSON.stringify(postData) ),
		function(err, stdout, stderr){
		callback(false, err);
	});

	sumrssi = 0;
	count = 0;
	}
}

function pushAWS(addr, vt, vh, callback) {
	var util = require('util');
	var spawn = require('child_process').spawn;
	var execFile = require('child_process').execFile;
	var mosqparam = [
		'--cafile', 'certs/rootCA.pem',
		'--cert', 'certs/keys/certificate.pem',
		'--key', 'certs/keys/private.key',
		'-h', 'a7dsuf6iddqdg.iot.us-west-2.amazonaws.com',
		'-p', '8883'
	];
	var logDate = new Date();
	var postData = {
		datetime: logDate.toISOString(),
		temperature: parseFloat(vt),
		humidity: parseFloat(vh)
	};
	console.log("pushAWS---", postData);
	// publish to main data queue (for DynamoDB)
	execFile('mosquitto_pub', mosqparam.concat('-t', 'temp-humidity/Sensor-' + addr, '-m', JSON.stringify(postData)),
		 function(err, stdout, stderr) {
			// published
			callback(false, err);
	});
	// publish to device shadow

	var shadowPayload = {
		state: {
			desired: {
				datetime: logDate.toISOString(),
				temperature: parseFloat(vt),
				humidity: parseFloat(vh)
			}
		}
	};
	execFile('mosquitto_pub', mosqparam.concat('-t','$aws/things/Sensor-' + addr +'shadow/update', '-m',
		 JSON.stringify(shadowPayload)), function(err, stdout, stderr) {
			// shadow update done
			callback(true, err);
	});

}




function pushLocalDB(addr, vt, vh, callback) {
	var con = mysql.createConnection({
		host: gConfig['dbHost'],
		user: "eldersens",
		password: gConfig['dbPasswd'],
		database: "dsdb"
	});
	var sql = `insert into diapersens_tbl(ts, addr, temp, humidity) values(now(), '${addr}', ${vt}, ${vh})`;
	console.log("pushLocalDB:", sql);
	con.query(sql, function(err, result) {
		callback(err);
		con.end();
	});
}

// pushAWS and detection algorithm simulation
function simulate() {
	var addr = 'Sim';
	var simDevice = new Device({'address': addr, 'rssi': 0});
	console.log('Start Simulation...');
	setInterval(function() {
		var temp = (Math.random() * (40 - 25) + 25).toFixed(2);
		var humidity = (Math.random() * (100 - 30) + 30).toFixed(2);
		if (gConfig['cloudUpdate']) {
			pushAWS(addr, temp, humidity, function(shadow, err) {
				if (err)
					console.log("AWS push error,", err, "shadow:", shadow);
			});
		}
		if (gConfig['localDBUpdate']) {
			pushLocalDB(addr, temp, humidity, function(err) {
				if (err)
					console.log("MySQL push error,", err);
			});
		}
		simDevice['temperature'] = temp;
		simDevice['humidity'] = humidity;
		doNotification(simDevice);
	}, 5000);
}


// Program starts here
if ((process.argv.length > 2) && (process.argv[2].toLowerCase() == 'calibrate')) {
	gCalibrate = true;
	if (process.argv[3])
		gCalibrateDevice = process.argv[3].toLowerCase();
}

noble.on('stateChange', function(state) {
	gState = state;
	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
});

noble.on('discover', function(peripheral) {
	if (peripheral.advertisement.localName == "CFX_FALLS" ||
	    (peripheral.advertisement.localName == "XuXuKou" && !gCalibrate)) {
		var addr = peripheral.address;
		var now = (new Date()).getTime();

		if (gCalibrate) {
			// Use the first found device if calibrate device is unspecified
			if (!gCalibrateDevice)
				gCalibrateDevice = addr;

			// Only allow one device per calibration
			if (addr != gCalibrateDevice)
				return;
		}





		var Rssi = peripheral.rssi;
		var TXPower = peripheral.advertisement.txPowerLevel;
		console.log("fallsens", addr, "rssi",Rssi ,"txp" ,TXPower);
		pushRouter(addr, 0 , 0 , Rssi ,TXPower , function(err){

		if( err ) console.log('pushRouter err--');


		});
		return;


		// Avoid duplicated connection, parallel connection and if we haven't heard a sensor
		// for 20s, we will reconnect with it (when adv is heard).
		if (gDevices[addr] && (now - gDevices[addr]['tsconn'] < 20 * 1000) &&
		    (gDevices[addr]['enabled'] == true || gDevices[addr]['connecting'] == true)) {
			//console.log("Quit connection: addr ", addr, "enable", gDevices[addr]['enabled'],
			//	    "connecting", gDevices[addr]['connecting'], "tsdiff", now - gDevices[addr]['tsconn']);
			//hciReset();
			return;
		}
		if (!gDevices[addr])
			gDevices[addr] = new Device(peripheral);

		if (peripheral.advertisement.localName == "XuXuKou") {
			if (!gDevices[addr]['firstadv'])
				gDevices[addr]['firstadv'] = now;
			if (now - gDevices[addr]['firstadv'] < 10 * 1000)
				return;
		}

		// start connection
		gDevices[addr]['connecting'] = true;
		gDevices[addr]['tsconn'] = now;
		peripheral.connect(function(err) {
			if (err) {
				console.log('Connect', addr, err);
				return;
			}
			gDevices[addr]['firstadv'] = 0;
			console.log('Connected to ' + peripheral.address + ' (RSSI ' + peripheral.rssi + ') on ' + new Date());
			peripheral.discoverServices(['1809', '6e400001b5a3f393e0a9e50e24dcca9e'], function(err, services) {
				var deviceInformationService = services[0];
				console.log("Discovered Health Thermometer GATT Service");
				deviceInformationService.discoverCharacteristics(['2a1c', '6e400003b5a3f393e0a9e50e24dcca9e'], function(err, characteristics) {
					var temperatureMeasurementCharacteristic = characteristics[0];
					console.log('Discovered Temperature Measurement Service');
					// enable notify
					temperatureMeasurementCharacteristic.notify(true, function(err) {
						console.log('Temperature Measurement Notification On');
						gDevices[addr]['enabled'] = true;
						gDevices[addr]['connecting'] = false;
						gDevices[addr]['tsconn'] = now;
					});
					// subscribe indicate
					temperatureMeasurementCharacteristic.subscribe(function(err) {
						temperatureMeasurementCharacteristic.on('data', function(data, isNotification) {
							switch (temperatureMeasurementCharacteristic.uuid) {
							case '2a1c':
								gDevices[addr]['type'] = TYPE_FALLSENS;
								break;
							case '6e400003b5a3f393e0a9e50e24dcca9e':
							default:
								gDevices[addr]['type'] = TYPE_DIAPERSENS;
								break;
							}
							processSensorData(addr, data);
						});
					});
				});
			});
			// handle disconnect event
			peripheral.once('disconnect', function() {
				var address = peripheral.address;
				if (gDevices[address] == undefined)
					bleScan();
				else if (gDevices[address]['enabled']) {
					console.log(address + ' (RSSI: ' + gDevices[address]['rssi'] + ') disconnected on ' + new Date());
					gDevices[address]['enabled'] = false;
					gDevices[address]['connecting'] = false;
					bleScan();
				}
			});
		});
	}
});

process.on("SIGINT", function() {
	console.log('Receives SIGINT');
	disconnect(function() {
		// exit
		process.exit();
	});
});

function SendEmail(recipient, subject, body, callback) {
	// Use SMTP Protocol to send Email
	let transporter = nodemailer.createTransport({
		service: 'Gmail',
		auth: {
			type: 'login',
			user: 'chuangfeixin',
			pass: 'www.chuangfeixin.com'
		},
		debug: false // include SMTP traffic in the logs
	}, {
		// default message fields
		// sender info
		from: 'CFX <chuangfeixin@gmail.com>',
	});

	// Message object
	let message = {
		to: recipient,
		subject: subject,
		text: body,
		html: "<b>" + body + "</b>"
	}

	transporter.sendMail(message, (err, info) => {
		if (err) {
			console.log(err);
			callback(err);
			return;
		} else {
			callback(null);
			//console.log("Message sent: " + info.response);
		}
		transporter.close();
	});
}

function SendSMS(phoneInfo, subject, body, cb) {
	var gateways = {
		'AT&T': 'txt.att.net',
		'Sprint': 'messaging.sprintpcs.com',
		'T-Mobile': 'tmomail.net',
		'Verizon': 'vtext.com'};
	var carrier = phoneInfo['carrier'];
	var number = phoneInfo['number'];

	if (gateways[carrier] == undefined) {
		cb("invalid carrier " + carrier);
		return;
	}
	// normalize U.S. phone number
	if (number[0] == '+')
		number = number.substring(1);
	if (number[0] == '1')
		number = number.substring(1);

	if (number.length != 10) {
		cb("invalid phone number " + number);
		return;
	}
	recipient = number + '@' + gateways[carrier];
	SendEmail(recipient, subject, body, cb);
}

setInterval(function() {
	for (addr in gDevices) {
		if (gDevices[addr]['enabled']) {
			var peripheral = gDevices[addr]['peripheral'];
			peripheral.updateRssi(function(err, rssi) {
				if (!err) {
					gDevices[addr]['rssi'] = rssi;
				}
			});
		// if the connecting state stuck for 30s
		} else if (gDevices[addr]['connecting'] && ((new Date()).getTime() - gDevices[addr]['tsconn'] > 30 * 1000)) {
			gDevices[addr]['peripheral'].disconnect(function() {
				//console.log("disconnect", addr, "after no activity for 30s");
			});
		}
	}
	bleScan();
}, 1000);

// handle MQTT management
mqsh.input_sub(os.hostname(), function(sub) {
	sub.stdout.on('data', (data) => {
		execCmd(data.toString(), function(err, output) {
			//if (err)
			//	console.log(err);
			//console.log(output);
		});
	});
	sub.stderr.on('data', (data) => {
		console.log('error: ' + data.toString());
	});
	sub.on('close', (code) => {
		if (code)
			console.log('exit: ' + code);
	});
});

module.exports.simulate = simulate;
