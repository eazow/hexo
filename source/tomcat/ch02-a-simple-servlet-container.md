#### Overview

This chapter explains how you can develop your own servlet container by presenting two applications. The first application has been designed to be as simple as possible to make it easy for you to understand how a servlet container works. It then evolves into the second servlet container, which is slightly more complex.

Note Every servlet container application in each chapter gradually evolves from the application in the previous chapter, until a fully-functional Tomcat servlet container is built in Chapter 17.

Both servlet containers can process simple servlets as well as static resources. You can use PrimitiveServlet to test this container. PrimitiveServlet is given in Listing 2.1 and its class file can be found in the webroot directory. More complex servlets are beyond the capabilities of these containers, but you will learn how to build more sophisticated servlet containers in the next chapters.

Listing 2.1: PrimitiveServlet.java

```
import javax.servlet.*;
import java.io.IOException;
import java.io.PrintWriter;

public class PrimitiveServlet implements Servlet {
    public void init(ServletConfig config) throws ServletException {
        System.out.println("init");
    }
    public void service(ServletRequest request, ServletResponse response)
            throws ServletException, IOException {
        System.out.println("from service");
        PrintWriter out = response.getWriter();
        out.println("Hello. Roses are red.");
        out.print("Violets are blue.");
    }
    public void destroy() {
        System.out.println("destroy");
    }

    public String getServletInfo() {
        return null;
    }
    public ServletConfig getServletConfig() {
        return null;
    }
}
```

The classes for both applications are part of the ex02.pyrmont package. To understand how the applications work, you need to be familiar with the javax.servlet.Servlet interface. To refresh your memory, this interface is discussed in the first section of this chapter. After that, you will learn what a servlet container has to do to serve HTTP requests for a servlet.



#### The javax.servlet.Servlet Interface