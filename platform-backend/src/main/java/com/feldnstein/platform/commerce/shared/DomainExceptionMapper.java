package com.feldnstein.platform.commerce.shared;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/** Business-rule violations are client errors, not server errors. */
@Provider
public class DomainExceptionMapper implements ExceptionMapper<DomainException> {

    @Override
    public Response toResponse(DomainException e) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(java.util.Map.of("error", e.getMessage() == null ? "request rejected" : e.getMessage()))
                .build();
    }
}
