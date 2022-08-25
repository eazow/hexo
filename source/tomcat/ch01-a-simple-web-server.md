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