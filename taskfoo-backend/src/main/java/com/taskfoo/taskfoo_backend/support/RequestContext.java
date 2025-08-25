// src/main/java/com/taskfoo/taskfoo_backend/support/RequestContext.java
package com.taskfoo.taskfoo_backend.support;

public class RequestContext {
    public String requestId;
    public String clientChangeId;
    public String pageContext;
    public String ip;
    public String userAgent;

    public Long actorId;
    public String actorName;

    private static final ThreadLocal<RequestContext> TL = new ThreadLocal<>();
    public static void set(RequestContext rc) { TL.set(rc); }
    public static RequestContext get() { return TL.get(); }
    public static void clear() { TL.remove(); }
}