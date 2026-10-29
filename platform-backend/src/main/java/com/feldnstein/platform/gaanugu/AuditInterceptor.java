package com.feldnstein.platform.gaanugu;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.Priority;
import jakarta.interceptor.AroundInvoke;
import jakarta.interceptor.Interceptor;
import jakarta.interceptor.InvocationContext;

/** Persists an audit_event row for every {@link Audited} mutation (ADR-0010). */
@Audited("")
@Interceptor
@Priority(Interceptor.Priority.LIBRARY_BEFORE + 10)
public class AuditInterceptor {

    private final SecurityIdentity identity;
    private final ObjectMapper mapper;

    public AuditInterceptor(SecurityIdentity identity, ObjectMapper mapper) {
        this.identity = identity;
        this.mapper = mapper;
    }

    @AroundInvoke
    Object around(InvocationContext ctx) throws Exception {
        Object result = ctx.proceed();
        try {
            AuditEvent e = new AuditEvent();
            e.actor = identity.isAnonymous() ? "anonymous" : identity.getPrincipal().getName();
            e.action = ctx.getMethod().getAnnotation(Audited.class).value();
            e.entityType = ctx.getMethod().getDeclaringClass().getSimpleName();
            try {
                e.detailJson = mapper.writeValueAsString(ctx.getParameters());
            } catch (Exception jsonEx) {
                e.detailJson = "[unserializable args]";
            }
            e.persist();
        } catch (Exception auditEx) {
            // Auditing must never break the business operation.
        }
        return result;
    }
}
