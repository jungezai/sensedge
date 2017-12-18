
SensEdge
========

This repo is for ElderSens Inc's SensEdge Project：Fallsens Location Display System.

###Preparation in advance
1.Connecting the LAN WiFi for 4 Router
Router is connected to the mouse and display, and the WiFi is manually connected, and 
it is set to an automatic connection. (default will be automatically connected next time)


2.Set the Host name of 4 Router
 4 raspberry pie Router as the positioning base, the position origin 4 of the Router 
 host name is set to "raspberrypi",and it will be the master Router to calculate 
 fallsens's position; a clockwise direction of the next Router name is "raspClient1",
 "raspClient2", the last "raspClient3".
 
         raspClient1**********************************************raspClient2
					*											 *
					*											 *
					*											 *
					*											 *
					*											 *
					*											 *
		 raspberrypi**********************************************raspClient3

3.Install samba
Execute the command line command: sudo apt-get install samba.
The purpose is to use the "nmblookup" command in the LAN to use the host name to query 
the corresponding IP address.
Execute the command line command: sudo apt-get install samba
waiting for the completion of installation.



###Install the main software
1.Install software
The folder "sensedge" is placed in the path: 
/home/pi/src/git/eldersens/sensedge; into the "sensedge" folder, 
execute command line: ./run.sh install 
waiting for the completion of installation.

2.Restart the Router
execute command line: sudo reboot
waiting for the completion of restart.

###The process of using the positioning system

1.Open sensedge service
The default will automatically turn on the sensedge service after boot. 
It can be commanded by command line: "sudo sensedge start", "sudo sensedge stop", 
"sudo sensedge restart" ,to opening、closing and restarting service.

2. view the location on the web page
(1)In running MasterRouter, through the command line command: "node webserver.js", 
run the "webserver.js" file under the "sensedge" folder to open the nodejs server.

(2)In one of the 4 Router,Open the "ajax.html" file under the "sensedge" folder through
 the browser, that is, you can see the change in the location on the web page.


###Other instructions 

In this sensedge service, the 4 Router will search attribute values around fallsens, 
through the command line: "tail- f var/log/sensedge.log" to view information and the corresponding error;
Master Router will open the MQTT server, and push on the receiving server TAG information, and the device
 MQTT attribute information stored in the "sensedge" folder under the "trying.log" file. 
The other 3 Router will push the distance data to the MQTT server, and also through command line command: "tail- f var/log/sensedge.log" 
to check the corresponding information and errors.

In Master Router, When the MQTT server receives the TAG message, it will save the data to the "trying.log" file under the "sensedge" folder.

In Master Router Sensedge service monitors the change of trying.log in real time. When new 4 distance data exist, sensedge service calls executable file "test",
 which saves the calculated device location information to position.log under the sensedge folder.
 
 After the nodejs server is opened, the server monitors the changes of the "position.log" file under the sensedge folder in real time, and waits 
 for the request of the webpage. When receiving the request of the webpage, it will return the device information of the requested device.

























