---
title: Introduction
categories: Java
tags: Tomcat
date: 2020-08-01 17:05:05
---



### OverView

Welcome to How Tomcat Works. This book dissects Tomcat 4.1.12 and 5.0.18 and explains the internal workings of its free, open source, and most popular servlet container code-named Catalina. Tomcat is a complex system, consisting of many different components. Those who want to learn how Tomcat works often do know where to start. What this book does is provide the big picture and then build a simpler version of each component to make understanding that component easier. Only after that will the real component be explained.

You should start by reading this Introduction as it explains the structure of the book and gives you the brief outline of the applications built. The section "Preparing the Prerequisite Software" gives you instructions on what software you need to download, how to make a directory structure for your code, etc.



### Who This Book Is for

This book is for anyone working with the Java technology.

- This book is for you if you are a servlet/JSP programmer or a Tomcat user and you are interested in knowing how a servlet container works.
- It is for you if you want to join the Tomcat development team because you need to first learn how the existing code works.
- If you have never been involved in web development but you have interest in software development in general, then you can learn from this book how a large application such as Tomcat was designed and developed.
- If you need to configure and customize Tomcat, you should read this book.

To understand the discussion in this book, you need to understand object-oriented programming in Java as well as servlet programming. If you are not familiar with the latter, there are a plethora of books on sendets, including Budi's Java for the Web with Servlets, JSP, and EJB. To make the material easier to understand, each chapter starts with background information that will be required to understand the topic in discussion.



### How A Servlet Container Works

A servlet container is a complex system. However, basically there are three things that a servlet container does to service a request for a servlet:

- Creating a request object and populate it with information that may be used by the invoked servlet, such as parameters, headers, cookies, query string, URI, etc. A request object is an instance of the javax.servlet.ServletRequest interface or the javax.servlet.http.ServletRequest interface.
- Creating a response object that the invoked servlet uses to send the response to the web client. A response object is an instance of the javax.servlet.ServletResponse interface or the javax.servlet.http.ServletResponse interface.
- Invoking the service method of the servlet, passing the request and response objects. Here the servlet reads the values from the request object and writes to the response object.

As you read the chapters, you will find detailed discussions of Catalina servlet container.

### Catalina Block Diagram

Catalina is a very sophisticated piece of software, which was elegantly designed and developed. It is also modular too. Based on the tasks mentioned in the section "How A Servlet Container Works", you can view Catalina as consisting of two main modules: the connector and the container.

The block diagram in Figure I.1 is, of course, simplistic. Later in the following chapters you will unveil all smaller components one by one.

Figure I.1: Catalina's main modules

Now, back to Figure I.1, the connector is there to connect a request with the container. Its job is to construct a request object and a response object for each HTTP request it receives. It then passes processing to the container. The container receives the request and response objects from the connector and is responsible for invoking the servlet's service method.

Bear in mind though, that the description above is only the tip of the iceberg. There are a lot of things that a container does. For example, before it can invoke a servlet's service method, it must load the servlet, authenticate the user (if required), update the session for that user, etc. It's not surprising then that a container uses many ￼￼￼￼￼different modules for processing. For example, the manager module is for processing user sessions, the loader is for loading servlet classess, etc.

### Tomcat 4 and 5

This book covers both Tomcat 4 and 5. Here are some of the differences between the two:

- Tomcat 5 supports Servlet 2.4 and JSP 2.0 specifications, Tomcat 4 supports Servlet 2.3 and JSP 1.2.
- Tomcat 5 has a more efficient default connector than Tomcat 4.
- Tomcat 5 shares a thread for background processing whereas Tomcat 4's
- components all have their own threads for background processing. Therefore, Tomcat 5 uses less resources in this regard.
- Tomcat 5 does not need a mapper component to find a child component, therefore simplifying the code.

### Overview of Each Chapter

There are 20 chapters in this book. The first two chapters serve as an introduction. Chapter 1 explains how an HTTP server works and Chapter 2 features a simple servlet container. The next two chapters focus on the connector and Chapters 5 to 20 cover each of the components in the container. The following is the summary of each of the chapters.

Note For each chapter, there is an accompanying application similar to the component being explained.

**Chapter 1** starts this book by presenting a simple HTTP server. To build a working HTTP server, you need to know the internal workings of two classes in the java.net package: Socket and ServerSocket. There is sufficient background information in this chapter about these two classes for you to understand how the accompanying application works.

**Chapter 2** explains how simple servlet containers work. This chapter comes with two servlet container applications that can service requests for static resources as well as very simple servlets. In particular, you will learn how you can create request and response objects and pass them to the requested servlet's service method. There is also a servlet that can be run inside the servlet containers and that you can invoke from a web browser.

**Chapter 3** presents a simplified version of Tomcat 4's default connector. The application built in this chapter serves as a learning tool to understand the connector discussed in Chapter 4.

**Chapter 4** presents Tomcat 4's default connector. This connector has been deprecated in favor of a faster connector called Coyote. Nevertheless, the default connector is simpler and easier to understand.

**Chapter 5** discusses the container module. A container is represented by the org.apache.catalina.Container interface and there are four types of containers: engine, host, context, and wrapper. This chapter offers two applications that work with contexts and wrappers.

**Chapter 6** explains the Lifecycle interface. This interface defines the lifecycle of a Catalina component and provides an elegant way of notifying other components of events that occur in that component. In addition, the Lifecycle interface provides an elegant mechanism for starting and stopping all the components in Catalina by one single start/stop.

**Chapter 7** covers loggers, which are components used for recording error messages and other messages.

**Chapter 8** explains about loaders. A loader is an important Catalina module responsible for loading servlet and other classes that a web application uses. This chapter also shows how application reloading is achieved.

**Chapter 9** discusses the manager, the component that manages sessions in session management. It explains the various types of managers and how a manager can persist session objects into a store. At the end of the chapter, you will learn how to build an application that uses a StandardManager instance to run a servlet that uses session objects to store values.

**Chapter 10** covers web application security constraints for restricting access to certain contents. You will learn entities related to security such as principals, roles, login config, authenticators, etc. You will also write two applications that install an authenticator valve in the StandardContext object and uses basic authentication to authenticate users.

**Chapter 11** explains in detail the org.apache.catalina.core.StandardWrapper class that represents a servlet in a web application. In particular, this chapter explains how filters and a servlet's service method are invoked. The application accompanying this chapter uses StandardWrapper instances to represents servlets.

**Chapter 12** covers the org.apache.catalina.core.StandardContext class that represents a web application. In particular this chapter discusses how a ￼￼￼￼￼￼￼￼￼￼StandardContext object is configured, what happens in it for each incoming HTTP request, how it supports automatic reloading, and how Tomcat 5 shares a thread that executes periodic tasks in its associated components.

**Chapter 13** presents the two other containers: host and engine. You can also find the standard implementation of these two containers:

- org.apache.catalina.core.StandardHost
- org.apache.catalina.core.StandardEngine

**Chapter 14** offers the server and service components. A server provides an elegant start and stop mechanism for the whole servlet container, a service serves as a holder for a container and one or more connectors. The application accompanying this chapter shows how to use a server and a service.

**Chapters 15** explains the configuration of a web application through Digester, an exciting open source project from the Apache Software Foundation. For those not initiated, this chapter presents a section that gently introduces the digester library and how to use it to convert the nodes in an XML document to Java objects. It then explains the ContextConfig object that configures a StandardContext instance.

**Chapter 16** explains the shutdown hook that Tomcat uses to always get a chance to do clean-up regardless how the user stops it (i.e. either appropriately by sending a shutdown command or inappropriately by simply closing the console.)

**Chapter 17** discusses the starting and stopping of Tomcat through the use of batch files and shell scripts.

**Chapter 18** presents the deployer, the component responsible for deploying and installing web applications.

**Chapter 19** discusses a special interface, ContainerServlet, to give a servlet access to the Catalina internal objects. In particular, it discusses the Manager application that you can use to manage deployed applications.

**Chapter 20** discusses JMX and how Tomcat make its internal objects manageable by creating MBeans for those objects.

### The Application for Each Chapter

Each chapter comes with one or more applications that focus on a specific component in Catalina. Normally you'll find the simplified version of the component being explained or code that explains how to use a Catalina component. All classes and interfaces in the chapters' applications reside in the ex[chapter ￼￼￼￼￼￼￼￼number].pyrmont package or its subpackages. For example, the classes in the application in **Chapter 1** are part of the ex01.pyrmont package.

### Preparing the Prerequisite Software

The applications accompanying this book run with J2SE version 1.4. The zipped source files can be downloaded from the authors' web site [www.brainysoftware.com](http://www.brainysoftware.com/). It contains the source code for Tomcat 4.1.12 and the applications used in this book. Assuming you have installed J2SE 1.4 and your path environment variable includes the location of the JDK, follow these steps:

1. Extractthezipfiles.Allextractedfileswillresideinanewdirectorycalled **HowTomcatWorks**. HowTomcatWorks is your working directory. There will be several subdirectories under HowTomcatWorks, including **lib** (containing all needed libraries), **src** (containing the source files), **webroot** (containing an HTML file and three sample servlets), and **webapps** (containing sample applications).
2. Changedirectorytotheworkingdirectoryandcompilethejavafiles.Ifyou are using Windows, run the **win-compile.bat** file. If your computer is a Linux machine, type the following: (don't forget to chmod the file if necessary)./linux-compile.sh

Note More information can be found in the Readme.txt file included in the ZIP file.

Note: All examples with Servlet API 3.1.0 and JDK 6