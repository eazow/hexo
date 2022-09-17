---
title: A Simple Web Server
categories: Java
tags: Tomcat
date: 2019-08-01
---



This chapter explains how Java web servers work. A web server is also called a Hypertext Transfer Protocol (HTTP) server because it uses HTTP to communicate with its clients, which are usually web browsers. A Java-based web server uses two important classes: java.net.Socket and java.net.ServerSocket, and communications are done through HTTP messages. It is therefore natural to start this chapter with a discussion of HTTP and the two classes. Afterwards, it goes on to explain the simple web server application that accompanies this chapter.



#### The Hypertext Transfer Protocol (HTTP)

HTTP is the protocol that allows web servers and browsers to send and receive data over the Internet. It is a request and response protocol. The client requests a file and the server responds to the request. HTTP uses reliable TCP connections—by default on TCP port 80. The first version of HTTP was HTTP/0.9, which was then overridden by HTTP/1.0. Replacing HTTP/1.0 is the current version of HTTP/1.1, which is defined in Request for Comments (RFC) 2616 and downloadable from http://www.w3.org/Protocols/HTTP/1.1/rfc2616.pdf.

*Note This section covers HTTP 1.1 only briefly and is intended to help you understand the messages sent by web server applications. If you are interested in more details, read RFC 2616*

In HTTP, it is always the client who initiates a transaction by establishing a connection and sending an HTTP request. The web server is in no position to contact a client or make a callback connection to the client. Either the client or the server can prematurely terminate a connection. For example, when using a web browser you can click the Stop button on your browser to stop the download process of a file, effectively closing the HTTP connection with the web server.



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

where POST is the request method, /examples/default.jsp represents the URI and HTTP/1.1 the Protocol/Version section.

Each HTTP request can use one of the many request methods as specified in the HTTP standards. The HTTP 1.1 supports seven types of request: GET, POST, HEAD, OPTIONS, PUT, DELETE, and TRACE. GET and POST are the most commonly used in Internet applications.

The URI specifies an Internet resource completely. A URI is usually interpreted as being relative to the server's root directory. Thus, it should always begin with a forward slash /. A Uniform Resource Locator (URL) is actually a type of URI (see http://www.ietf.org/rfc/rfc2396.txt). The protocol version represents the version of the HTTP protocol being used.

The request header contains useful information about the client environment and the entity body of the request. For example, it could contain the language the browser is set for, the length of the entity body, and so on. Each header is separated by a carriage return/linefeed (CRLF) sequence.

Between the headers and the entity body, there is a blank line (CRLF) that is important to the HTTP request format. The CRLF tells the HTTP server where the entity body begins. In some Internet programming books, this CRLF is considered the fourth component of an HTTP request.

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

The first line of the response header is similar to the first line of the request header. The first line tells you that the protocol used is HTTP version 1.1, the request succeeded (200 = success), and that everything went okay.

The response headers contain useful information similar to the headers in the request. The entity body of the response is the HTML content of the response itself. The headers and the entity body are separated by a sequence of CRLFs.



#### The Socket Class

A socket is an endpoint of a network connection. A socket enables an application to read from and write to the network. Two software applications residing on two different computers can communicate with each other by sending and receiving byte streams over a connection. To send a message from your application to another application, you need to know the IP address as well as the port number of the socket of the other application. In Java, a socket is represented by the java.net.Socket class.

To create a socket, you can use one of the many constructors of the Socket class. One of these constructors accepts the host name and the port number:

```
public Socket (java.lang.String host, int port)
```

where `host` is the remote machine name or IP address and `port` is the port number of the remote application. For example, to connect to yahoo.com at port 80, you would construct the following Socket object:

```
new Socket ("yahoo.com", 80);
```

Once you create an instance of the Socket class successfully, you can use it to send and receive streams of bytes. To send byte streams, you must first call the Socket class's getOutputStream method to obtain a `java.io.OutputStream` object. To send text to a remote application, you often want to construct a `java.io.PrintWriter` object from the OutputStream object returned. To receive byte streams from the other end of the connection, you call the Socket class's `getInputStream` method that returns a `java.io.InputStream`.

The following code snippet creates a socket that can communicate with a local HTTP server (127.0.0.1 denotes a local host), sends an HTTP request, and receives the response from the server. It creates a StringBuffer object to hold the response and prints it on the console.

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

Note that to get a proper response from the web server, you need to send an HTTP request that complies with the HTTP protocol. If you have read the previous section, The Hypertext Transfer Protocol (HTTP), you should be able to understand the HTTP request in the code above.

**Note** *You can use the com.brainy software.pyrmont.util.HttpSniffer class included with this book to send an HTTP request and display the response. To use this Java program, you must be connected to the Internet. Be warned, though, that it may not work if you are behind a firewall.*



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

Our web server application is part of the ex01.pyrmont package and consists of three classes:

- HttpServer
- Request
- Response

The entry point of this application (the static main method) can be found in the `HttpServer` class. The main method creates an instance of HttpServer and calls its await method. The await method, as the name implies, waits for HTTP requests on a designated port, processes them, and sends responses back to the clients. It keeps waiting until a shutdown command is received.

The application cannot do more than sending static resources, such as HTML files and image files, residing in a certain directory. It also displays the incoming HTTP request byte streams on the console. However, it does not send any header, such as dates or cookies, to the browser.

We will now take a look at the three classes in the following subsections.



#### The HttpServer Class

The HttpServer class represents a web server and is presented in Listing 1.1. Note that the await method is given in Listing 1.2 and is not repeated in Listing 1.1 to save space.

Listing 1.1: The HttpServer Class

```
package ex01.pyrmont;
import java.net.Socket;
import java.net.ServerSocket;
import java.net.InetAddress;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.io.File;
public class HttpServer {
    /** WEB_ROOT is the directory where our HTML and other files reside.
    * For this package, WEB_ROOT is the "webroot" directory under the
    * working directory.
    * The working directory is the location in the file system
    * from where the java command was invoked.
    */
    public static final String WEB_ROOT =
        System.getProperty("user.dir") + File.separator + "webroot";
    // shutdown command
    private static final String SHUTDOWN_COMMAND = "/SHUTDOWN";

    // the shutdown command received
    private boolean shutdown = false;

    public static void main(String[] args) {
        HttpServer server = new HttpServer();

        server.await();
    }

    public void await() {

    }
}
```



Listing 1.2: The HttpServer class's await method

```
public void await() {
    ServerSocket serverSocket = null;
    int port = 8081;
    try {
        serverSocket = new ServerSocket(port, 1, InetAddress
                .getByName("127.0.0.1"));
    } catch (IOException e) {
        e.printStackTrace();
        System.exit(1);
    }
    // Loop waiting for a request
    while (!shutdown) {
        Socket socket = null;
        InputStream input = null;
        OutputStream output = null;

        try {
            socket = serverSocket.accept();
            input = socket.getInputStream();
            output = socket.getOutputStream();
            // create Request object and parse
            Request request = new Request(input);
            request.parse();

            // create Response object
            Response response = new Response(output);
            response.setRequest(request);
            response.sendStaticResource();

            // Close the socket
            socket.close();
            // check if the previous URI is a shutdown command
            shutdown = request.getUri().equals(SHUTDOWN_COMMAND);
        } catch (Exception e) {
            e.printStackTrace();
            continue;
        }
    }
}
```

This web server can serve static resources found in the directory indicated by the public static final WEB_ROOT and all subdirectories under it. WEB_ROOT is initialized as follows:

```
public static final String WEB_ROOT =
    System.getProperty("user.dir") + File.separator + "webroot";
```

The code listings include a directory called webroot that contains some static resources that you can use for testing this application. You can also find several servlets in the same directory for testing applications in the next chapters.

To request for a static resource, you type the following URL in your browser's Address or URL box:

http://machineName:port/staticResource

If you are sending a request from a different machine from the one running your application, machineName is the name or IP address of the computer running this application. If your browser is on the same machine, you can use localhost for the machineName.port is 8080 and staticResource is the name of the file requested and must reside in WEB_ROOT.

For instance, if you are using the same computer to test the application and you want to ask the HttpServer object to send the index.html file, you use the following URL:

http://localhost:8080/index.html

To stop the server, you send a shutdown command from a web browser by typing the pre-defined string in the browser's Address or URL box, after the host:port section of the URL. The shutdown command is defined by the SHUTDOWN static final variable in the HttpServer class:

```
private static final String SHUTDOWN_COMMAND = "/SHUTDOWN";
```

Therefore, to stop the server, you use the following URL:

http://localhost:8080/SHUTDOWN

Now, let's look at the await method printed in Listing 1.2.

The method name await is used instead of wait because wait is an important method in the java.lang.Object class for working with threads.

The await method starts by creating an instance of ServerSocket and then going into a while loop.

```
serverSocket = new ServerSocket(port, 1, InetAddress.getByName("127.0.0.1"));
...
// Loop waiting for a request
while (!shutdown) {
    ...
}
```

The code inside the while loop stops at the accept method of ServerSocket, which returns only when an HTTP request is received on port 8080:

```
socket = serverSocket.accept();
```

Upon receiving a request, the await method obtains java.io.InputStream and java.io.OutputStream objects from the Socket instance returned by the accept method.

```
input = socket.getInputStream();
output = socket.getOutputStream();
```

The await method then creates an ex01.pyrmont.Request object and calls its parse method to parse the HTTP request raw data.

```
// create Request object and parse
Request request = new Request(input);
request.parse ();
```

Afterwards, the await method creates a Response object, sets the Request object to it, and calls its sendStaticResource method.

```
// create Response object
Response response = new Response(output);
response.setRequest(request);
response.sendStaticResource();
```

Finally, the await method closes the Socket and calls the getUri method of Request to check if the URI of the HTTP request is a shutdown command. If it is, the shutdown variable is set to true and the program exits the while loop.

```
// Close the socket
socket.close();

//check if the previous URI is a shutdown command
shutdown = request.getUri().equals(SHUTDOWN_COMMAND);
```



#### The Request Class

The ex01.pyrmont.Request class represents an HTTP request. An instance of this class is constructed by passing the InputStream object obtained from a Socket that handles the communication with the client. You call one of the read methods of the InputStream object to obtain the HTTP request raw data.

The Request class is offered in Listing 1.3. The Request class has two public methods, parse and getUri, which are given in Listings 1.4 and 1.5, respectively.

Listing 1.3: The Request class

```
package ex01.pyrmont;

import java.io.InputStream;
import java.io.IOException;

public class Request {
		private InputStream input;
		private String uri;
		
		public Request(InputStream input) {
				this.input = input;
		}
    public void parse() {
    		...
    }
    private String parseUri(String requestString) {...
    }
    public String getUri() {
		    return uri;
    }
}
```

Listing 1.4: The Request class's parse method

```
public void parse() {
    // Read a set of characters from the socket
    StringBuffer request = new StringBuffer(2048);
    int i;
    byte[] buffer = new byte[2048];
    try {
        i = input.read(buffer);
    }
    catch (IOException e) {
        e.printStackTrace();
        i = -1;
    }
    for (int j=0; j<i; j++) {
   			request.append((char) buffer[j]);
    }
		System.out.print(request.toString());
    uri = parseUri(request.toString());
}
```



Listing 1.5: the Request class's parseUri method

```
private String parseUri(String requestString) {
		int index1, index2;
		index1 = requestString.indexOf(' ');
  	if (index1 != -1) {
			  index2 = requestString.indexOf(' ', index1 + 1);
  			if (index2 > index1)
  				return requestString.substring(index1 + 1, index2);
  	}
	  return null;
}
```

The parse method parses the raw data in the HTTP request. Not much is done by this method. The only information it makes available is the URI of the HTTP request that it obtains by calling the private method parseUri. The parseUri method stores the URI in the uri variable. The public getUri method is invoked to return the URI of the HTTP request.

*Note More processing of the HTTP request raw data will be done in the applications*
*accompanying Chapter 3 and the subsequent chapters.*

To understand how the parse and parseUri methods work, you need to know the structure of an HTTP request, discussed in the previous section, "The Hypertext Transfer Protocol (HTTP)". In this chapter, we are only interested in the first part of the HTTP request, the request line. A request line begins with a method token, followed by the request URI and the protocol version, and ends with carriage-return linefeed (CRLF) characters. Elements in a request line are separated by a space character. For instance, the request line for a request for the index.html file using the GET method is as follows.

```
GET /index.html HTTP/1.1
```

The parse method reads the whole byte stream from the socket's InputStream that is passed to the Request object and stores the byte array in a buffer. It then populates a StringBuffer object called request using the bytes in the buffer byte array, and passes the String representation of the StringBuffer to the parseUri method.

The parse method is given in Listing 1.4.

The parseUri method then obtains the URI from the request line. Listing 1.5 presents the parseUri method. The parseUri method searches for the first and the second spaces in the request and obtains the URI from it.



#### The Response Class

The ex01.pyrmont.Response class represents an HTTP response and is given in Listing 1.6.

Listing 1.6: The Response class

```
package ex01.pyrmont;
import java.io.OutputStream;import java.io.IOException;
import java.io.FileInputStream;
import java.io.File;
/*
HTTP Response = Status-Line
*(( general-header | response-header | entity-header ) CRLF)
CRLF
[ message-body ]
Status-Line = HTTP-Version SP Status-Code SP Reason-Phrase CRLF
*/
public class Response {
    private static final int BUFFER_SIZE = 1024;
    Request request;
    OutputStream output;
    public Response(OutputStream output) {
        this.output = output;
    }
    public void setRequest(Request request) {
        this.request = request;
    }
    public void sendStaticResource() throws IOException {
        byte[] bytes = new byte[BUFFER_SIZE];
        FileInputStream fis = null;
        try {
            File file = new File(HttpServer.WEB_ROOT, request.getUri());
            if (file.exists()) {
                fis = new FileInputStream(file);
                int ch = fis.read(bytes, 0, BUFFER_SIZE);
                while (ch!=-1) {
                    output.write(bytes, 0, ch);
                    ch = fis.read(bytes, 0, BUFFER_SIZE);
                }
            }
            else {
                // file not found
                String errorMessage = "HTTP/1.1 404 File Not Found\r\n" +
                "Content-Type: text/html\r\n" +
                "Content-Length: 23\r\n" +"\r\n" +
                "<h1>File Not Found</h1>";
                output.write(errorMessage.getBytes());
            }
        }
        catch (Exception e) {
            // thrown if cannot instantiate a File object
            System.out.println(e.toString() );
        }
        finally {
            if (fis!=null)
            fis.close();
        }
    }
}
```

First note that its constructor accepts a java.io.OutputStream object, such as the following.

```
public Response(OutputStream output) {
    this.output = output;
}
```

A Response object is constructed by the HttpServer class's await method by passing the OutputStream object obtained from the socket.

The Response class has two public methods: setRequest and sendStaticResource method. The setRequest method is used to pass a Request object to the Response object.

The sendStaticResource method is used to send a static resource, such as an HTML file. It first instantiates the java.io.File class by passing the parent path and child path to the File class's constructor.

```
File file = new File(HttpServer.WEB_ROOT, request.getUri());
```

It then checks if the file exists. If it does, sendStaticResource constructs a `java.io.FileInputStream` object by passing the File object. Then, it invokes the read method of the FileInputStream and writes the byte array to the OutputStream output. Note that in this case the content of the static resource is sent to the browser as raw data.

```
if (file.exists()) {
    fis = new FileInputstream(file);
    int ch = fis.read(bytes, 0, BUFFER_SIZE);
    while (ch!=-1) {
        output.write(bytes, 0, ch);
        ch = fis.read(bytes, 0, BUFFER_SIZE);
    }
}
```

If the file does not exist, the sendStaticResource method sends an error message to the browser.

```
String errorMessage = "HTTP/1.1 404 File Not Found\r\n" +
    "Content-Type: text/html\r\n" +
    "Content-Length: 23\r\n" +
    "\r\n" +
    "<h1>File Not Found</h1>";
output.write(errorMessage.getBytes())
```



#### Running the Application

To run the application, from the working directory, type the following:

```
$ java ex01.pyront.HttpServer
```

To test the application, open your browser and type the following in the URL or
Address box:

http://localhost:8080/index.html

You will see the index.html page displayed in your browser, as in Figure 1.1

<img src="/Users/01398068/hexo/hexo/source/tomcat/figure1.1.png" alt="image-20220917231611295" style="zoom: 50%;" />

Figure 1.1: The output from the web server

On the console, you can see the HTTP request similar to the following:

```
GET /index.html HTTP/1.1
Accept: image/gif, image/x-xbitmap, image/jpeg, image/pjpeg,
application/vnd.ms-excel, application/msword, application/vnd.mspowerpoint, application/x-shockwave-flash, application/pdf, */*
Accept-Language: en-us
Accept-Encoding: gzip, deflate
User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR
1.1.4322)
Host: localhost:8080
Connection: Keep-Alive
GET /images/logo.gif HTTP/1.1
Accept: */*
Referer: http://localhost:8080/index.html
Accept-Language: en-us
Accept-Encoding: gzip, deflate
User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR
1.1.4322)
Host: localhost:8080
Connection: Keep-Alive
```



#### Summary

In this chapter you have seen how a simple web server works. The application accompanying this chapter consists of only three classes and is not fully functional. Nevertheless, it serves as a good learning tool. The next chapter will discuss the processing of dynamic contents.

