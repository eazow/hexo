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

