---
title: A Simple Web Server
categories: Java
tags: Tomcat
date: 2019-08-01
---



This chapter explains how Java web servers work. A web server is also called a
Hypertext Transfer Protocol (HTTP) server because it uses HTTP to communicate
with its clients, which are usually web browsers. A Java-based web server uses two
important classes: java.net.Socket and java.net.ServerSocket, and communications
are done through HTTP messages. It is therefore natural to start this chapter with a
discussion of HTTP and the two classes. Afterwards, it goes on to explain the simple
web server application that accompanies this chapter.



#### The Hypertext Transfer Protocol (HTTP)

HTTP is the protocol that allows web servers and browsers to send and receive data
over the Internet. It is a request and response protocol. The client requests a file
and the server responds to the request. HTTP uses reliable TCP connections—by
default on TCP port 80. The first version of HTTP was HTTP/0.9, which was then
overridden by HTTP/1.0. Replacing HTTP/1.0 is the current version of HTTP/1.1,
which is defined in Request for Comments (RFC) 2616 and downloadable from
http://www.w3.org/Protocols/HTTP/1.1/rfc2616.pdf.

*Note This section covers HTTP 1.1 only briefly and is intended to help you*
*understand the messages sent by web server applications. If you are interested*
*in more details, read RFC 2616*

In HTTP, it is always the client who initiates a transaction by establishing a
connection and sending an HTTP request. The web server is in no position to
contact a client or make a callback connection to the client. Either the client or the
server can prematurely terminate a connection. For example, when using a web
browser you can click the Stop button on your browser to stop the download process
of a file, effectively closing the HTTP connection with the web server.



#### HTTP Requests

An HTTP request consists of three components:

- Method—Uniform Resource Identifier (URI)—Protocol/Version
- Request headers
- Entity body

An example of an HTTP request is the following:

```
POST /examples/default.jsp HTTP/1.1Accept: text/plain; text/html
Accept-Language: en-gb
Connection: Keep-Alive
Host: localhost
User-Agent: Mozilla/4.0 (compatible; MSIE 4.01; Windows 98)
Content-Length: 33
Content-Type: application/x-www-form-urlencoded
Accept-Encoding: gzip, deflate

lastName=Franks&firstName=Michael
```

The method—URI—protocol version appears as the first line of the request.

```
POST /examples/default.jsp HTTP/1.1
```

where POST is the request method, /examples/default.jsp represents the URI and
HTTP/1.1 the Protocol/Version section.

Each HTTP request can use one of the many request methods as specified in the
HTTP standards. The HTTP 1.1 supports seven types of request: GET, POST,
HEAD, OPTIONS, PUT, DELETE, and TRACE. GET and POST are the most
commonly used in Internet applications.

The URI specifies an Internet resource completely. A URI is usually interpreted as
being relative to the server's root directory. Thus, it should always begin with a
forward slash /. A Uniform Resource Locator (URL) is actually a type of URI (see
http://www.ietf.org/rfc/rfc2396.txt). The protocol version represents the version of
the HTTP protocol being used.

The request header contains useful information about the client environment and the
entity body of the request. For example, it could contain the language the browser is
set for, the length of the entity body, and so on. Each header is separated by a
carriage return/linefeed (CRLF) sequence.

Between the headers and the entity body, there is a blank line (CRLF) that is
important to the HTTP request format. The CRLF tells the HTTP server where the
entity body begins. In some Internet programming books, this CRLF is considered
the fourth component of an HTTP request.

In the previous HTTP request, the entity body is simply the following line:

```
lastName=Franks&firstName=Michael
```

The entity body can easily become much longer in a typical HTTP request.



#### HTTP Responses

Similar to an HTTP request, an HTTP response also consists of three parts:

- Protocol—Status code—Description
- Response headers
- Entity body

The following is an example of an HTTP response:

```
HTTP/1.1 200 OK
Server: Microsoft-IIS/4.0
Date: Mon, 5 Jan 2004 13:13:33 GMT
Content-Type: text/html
Last-Modified: Mon, 5 Jan 2004 13:13:12 GMT
Content-Length: 112
<html>
<head>
<title>HTTP Response Example</title>
</head>
<body>
Welcome to Brainy Software
</body>
</html>
```

The first line of the response header is similar to the first line of the request header.
The first line tells you that the protocol used is HTTP version 1.1, the request
succeeded (200 = success), and that everything went okay.

The response headers contain useful information similar to the headers in the request.
The entity body of the response is the HTML content of the response itself. The
headers and the entity body are separated by a sequence of CRLFs.



#### The Socket Class

A socket is an endpoint of a network connection. A socket enables an application to
read from and write to the network. Two software applications residing on two
different computers can communicate with each other by sending and receiving byte
streams over a connection. To send a message from your application to another
application, you need to know the IP address as well as the port number of the socket
of the other application. In Java, a socket is represented by the java.net.Socket
class.

To create a socket, you can use one of the many constructors of the Socket class.
One of these constructors accepts the host name and the port number:

```
public Socket (java.lang.String host, int port)
```

where `host` is the remote machine name or IP address and `port` is the port number of
the remote application. For example, to connect to yahoo.com at port 80, you would
construct the following Socket object:

```
new Socket ("yahoo.com", 80);
```

Once you create an instance of the Socket class successfully, you can use it to send
and receive streams of bytes. To send byte streams, you must first call the Socket
class's getOutputStream method to obtain a `java.io.OutputStream` object. To send
text to a remote application, you often want to construct a `java.io.PrintWriter`
object from the OutputStream object returned. To receive byte streams from the
other end of the connection, you call the Socket class's `getInputStream` method that
returns a `java.io.InputStream`.

The following code snippet creates a socket that can communicate with a local HTTP
server (127.0.0.1 denotes a local host), sends an HTTP request, and receives the
response from the server. It creates a StringBuffer object to hold the response and
prints it on the console.

```
Socket socket = new Socket("127.0.0.1", "8080");
OutputStream os = socket.getOutputStream();
boolean autoflush = true;
PrintWriter out = new PrintWriter(
	socket.getOutputStream(), autoflush);
BufferedReader in = new BufferedReader(
	new InputStreamReader( socket.getInputstream() ));
// send an HTTP request to the web server
out.println("GET /index.jsp HTTP/1.1");
out.println("Host: localhost:8080");
out.println("Connection: Close");
out.println();
// read the response
boolean loop = true;
StringBuffer sb = new StringBuffer(8096);
while (loop) {
	if ( in.ready() ) {
		int i=0;
		while (i!=-1) {
			i = in.read();
			sb.append((char) i);
		}
		loop = false;
	}
	Thread.currentThread().sleep(50);
}

// display the response to the out console
System.out.println(sb.toString());
socket.close();
```

Note that to get a proper response from the web server, you need to send an HTTP
request that complies with the HTTP protocol. If you have read the previous section,
The Hypertext Transfer Protocol (HTTP), you should be able to understand the
HTTP request in the code above.

**Note** *You can use the com.brainysoftware.pyrmont.util.HttpSniffer class included*
*with this book to send an HTTP request and display the response. To use this*
*Java program, you must be connected to the Internet. Be warned, though, that*
*it may not work if you are behind a firewall.*



#### The ServerSocket Class

The Socket class represents a "client" socket, i.e. a socket that you construct whenever you want to connect to a remote server application. Now, if you want to implement a server application, such as an HTTP server or an FTP server, you need a different approach. This is because your server must stand by all the time as it does not know when a client application will try to connect to it. In order for your application to be able to stand by all the time, you need to use the `java.net.ServerSocket` class. This is an implementation of a server socket.

`ServerSocket` is different from Socket. The role of a server socket is to wait for connection requests from clients. Once the server socket gets a connection request, it creates a Socket instance to handle the communication with the client.

To create a server socket, you need to use one of the four constructors the `ServerSocket` class provides. You need to specify the IP address and port number the server socket will be listening on. Typically, the IP address will be 127.0.0.1, meaning that the server socket will be listening on the local machine. The IP address the server socket is listening on is referred to as the binding address. Another important property of a server socket is its backlog, which is the maximum queue length of incoming connection requests before the server socket starts to refuse the incoming requests.

One of the constructors of the ServerSocket class has the following signature:

```
public ServerSocket(int port, int backLog, InetAddress bindingAddress);
```

Notice that for this constructor, the binding address must be an instance of `java.net.InetAddress`. An easy way to construct an InetAddress object is by calling its static method `getByName`, passing a String containing the host name, such as in the following code.

```
InetAddress.getByName("127.0.0.1");
```

The following line of code constructs a ServerSocket that listens on port 8080 of the local machine. The ServerSocket has a backlog of 1.

```
new ServerSocket(8080, 1, InetAddress.getByName("127.0.0.1"));
```

Once you have a `ServerSocket` instance, you can tell it to wait for an incoming connection request to the binding address at the port the server socket is listening on. You do this by calling the `ServerSocket` class's accept method. This method will only return when there is a connection request and its return value is an instance of the Socket class. This Socket object can then be used to send and receive byte streams from the client application, as explained in the previous section, "The Socket Class". Practically, the accept method is the only method used in the application accompanying this chapter.



#### The Application

Our web server application is part of the ex01.pyrmont package and consists of three
classes:

- HttpServer
- Request
- Response

The entry point of this application (the static main method) can be found in the `HttpServer` class. The main method creates an instance of HttpServer and calls its await method. The await method, as the name implies, waits for HTTP requests on a designated port, processes them, and sends responses back to the clients. It keeps waiting until a shutdown command is received.

The application cannot do more than sending static resources, such as HTML files and image files, residing in a certain directory. It also displays the incoming HTTP request byte streams on the console. However, it does not send any header, such as dates or cookies, to the browser.

We will now take a look at the three classes in the following subsections.



#### The HttpServer Class

The HttpServer class represents a web server and is presented in Listing 1.1. Note that the await method is given in Listing 1.2 and is not repeated in Listing 1.1 to save space.

