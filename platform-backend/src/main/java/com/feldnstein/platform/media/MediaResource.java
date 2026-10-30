package com.feldnstein.platform.media;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Path("/")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MediaResource {

    @Inject MediaService mediaService;
    @Inject MediaAssetRepository assets;
    @Inject jakarta.enterprise.inject.Instance<MediaStorage> storageLookup;

    private String user(SecurityContext ctx) { return ctx.getUserPrincipal() == null ? "unknown" : ctx.getUserPrincipal().getName(); }

    public record MetaRequest(String assetKey, String altText) {}

    @POST @Path("/g/media/presign") @RolesAllowed({"ADMIN", "OPERATOR"})
    public MediaService.PresignResponse presign(MediaService.PresignRequest req, @Context SecurityContext ctx) {
        return mediaService.presign(req, user(ctx));
    }

    /** Dev-storage upload receiver — the LocalDiskStorage presign points here. */
    @PUT @Path("/g/media/dev-upload/{storageKey:.+}") @RolesAllowed({"ADMIN", "OPERATOR"})
    @Consumes(MediaType.WILDCARD)
    @Transactional
    public Response devUpload(@PathParam("storageKey") String storageKey, InputStream body,
                              @HeaderParam("Content-Type") String contentType) {
        try {
            mediaService.devUpload(storageKey, body.readAllBytes(), contentType);
            return Response.noContent().build();
        } catch (java.io.IOException e) {
            throw new BadRequestException("upload failed: " + e.getMessage());
        }
    }

    @POST @Path("/g/media/{id}/finalize") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response finalizeAsset(@PathParam("id") long id) {
        mediaService.finalizeAsset(id);
        return Response.ok(Map.of("status", "queued")).build();
    }

    @POST @Path("/g/media/{id}/retry") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response retry(@PathParam("id") long id) {
        mediaService.retry(id);
        return Response.ok(Map.of("status", "queued")).build();
    }

    @POST @Path("/g/media/{id}/publish") @RolesAllowed({"ADMIN", "OPERATOR"})
    @com.feldnstein.platform.gaanugu.Audited("MEDIA_PUBLISH")
    public Response publish(@PathParam("id") long id) {
        mediaService.setPublished(id, true);
        return Response.noContent().build();
    }

    @POST @Path("/g/media/{id}/unpublish") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response unpublish(@PathParam("id") long id) {
        mediaService.setPublished(id, false);
        return Response.noContent().build();
    }

    @PUT @Path("/g/media/{id}") @RolesAllowed({"ADMIN", "OPERATOR"})
    public Response updateMeta(@PathParam("id") long id, MetaRequest req) {
        mediaService.updateMeta(id, req.assetKey(), req.altText());
        return Response.noContent().build();
    }

    @DELETE @Path("/g/media/{id}") @RolesAllowed({"ADMIN", "OPERATOR"})
    @com.feldnstein.platform.gaanugu.Audited("MEDIA_DELETE")
    public Response delete(@PathParam("id") long id) {
        mediaService.delete(id);
        return Response.noContent().build();
    }

    @GET @Path("/g/media") @RolesAllowed({"ADMIN", "OPERATOR"})
    public List<Map<String, Object>> list() {
        return assets.listAll().stream().map(a -> Map.<String, Object>ofEntries(
                Map.entry("id", a.id),
                Map.entry("assetKey", a.assetKey),
                Map.entry("originalFilename", a.originalFilename),
                Map.entry("contentType", a.contentType),
                Map.entry("sizeBytes", a.sizeBytes),
                Map.entry("altText", a.altText == null ? "" : a.altText),
                Map.entry("status", a.status.name()),
                Map.entry("finalized", a.finalized),
                Map.entry("errorNote", a.errorNote == null ? "" : a.errorNote),
                Map.entry("variants", mediaService.variantUrls(a)),
                Map.entry("createdBy", a.createdBy == null ? "" : a.createdBy))).toList();
    }

    /** Public, cache-immutable media byte serving. */
    @GET @Path("/site/media/file/{key:.+}") @PermitAll
    @Produces("image/jpeg")
    public Response file(@PathParam("key") String key) {
        byte[] bytes;
        try {
            bytes = storageLookup.get().read(key);
        } catch (MediaObjectNotFoundException e) {
            throw new NotFoundException("media not found");
        }
        return Response.ok(bytes)
                .type("image/jpeg")
                .header("Cache-Control", "public, max-age=86400, immutable")
                .build();
    }
}
