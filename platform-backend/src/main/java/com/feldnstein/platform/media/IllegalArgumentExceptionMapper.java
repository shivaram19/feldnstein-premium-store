package com.feldnstein.platform.media;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/** Validation failures in the media pipeline are client errors, not server errors. */
@Provider
public class IllegalArgumentExceptionMapper implements ExceptionMapper<IllegalArgumentException> {

    @Override
    public Response toResponse(IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(java.util.Map.of("error", e.getMessage() == null ? "bad request" : e.getMessage()))
                .build();
    }
}
