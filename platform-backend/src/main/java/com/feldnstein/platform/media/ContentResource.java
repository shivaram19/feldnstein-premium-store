package com.feldnstein.platform.media;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import java.util.List;
import java.util.Map;

@Path("/g/site-content")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class ContentResource {

    @Inject ContentBlockRepository blocks;
    @Inject ProductMarketingRepository marketing;
    @Inject ObjectMapper mapper;

    public record BlockRequest(String payload) {}

    @PUT @Path("/{key:.+}")
    @Transactional
    @com.feldnstein.platform.gaanugu.Audited("CONTENT_UPDATE")
    public Response putBlock(@PathParam("key") String key, BlockRequest req, @Context SecurityContext ctx) {
        if (!key.matches("[a-z0-9:.-]{3,128}")) throw new BadRequestException("invalid block key");
        try {
            mapper.readTree(req.payload());
        } catch (Exception e) {
            throw new BadRequestException("payload must be valid JSON: " + e.getMessage());
        }
        ContentBlock block = blocks.find("blockKey", key).firstResult();
        if (block == null) {
            block = new ContentBlock();
            block.blockKey = key;
            block.payload = req.payload();
            block.updatedBy = ctx.getUserPrincipal().getName();
            block.persist();
        } else {
            block.payload = req.payload();
            block.updatedBy = ctx.getUserPrincipal().getName();
        }
        return Response.noContent().build();
    }

    @GET @Path("/{key:.+}")
    public Map<String, Object> getBlock(@PathParam("key") String key) {
        ContentBlock block = blocks.find("blockKey", key).firstResult();
        if (block == null) throw new NotFoundException("block not found: " + key);
        try {
            return Map.of("blockKey", block.blockKey, "payload", mapper.readTree(block.payload),
                    "updatedBy", block.updatedBy == null ? "" : block.updatedBy,
                    "updatedAt", block.updatedAt.toString());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public record MarketingRequest(String badge, String shortDesc, String longDesc, Long cardAssetId) {}

    @PUT @Path("/product-marketing/{productId}")
    @Transactional
    @com.feldnstein.platform.gaanugu.Audited("CONTENT_UPDATE")
    public Response putMarketing(@PathParam("productId") long productId, MarketingRequest req) {
        ProductMarketing pm = marketing.find("product.id", productId).firstResult();
        if (pm == null) {
            pm = new ProductMarketing();
            pm.product = com.feldnstein.platform.gaanugu.OilProduct.findById(productId);
            if (pm.product == null) throw new NotFoundException("product not found");
            pm.persist();
        }
        pm.badge = req.badge();
        pm.shortDesc = req.shortDesc();
        pm.longDesc = req.longDesc();
        pm.cardAsset = req.cardAssetId() == null ? null : MediaAsset.findById(req.cardAssetId());
        if (req.cardAssetId() != null && pm.cardAsset == null) throw new NotFoundException("asset not found");
        return Response.noContent().build();
    }

    @GET @Path("/product-marketing")
    public List<ProductMarketing> listMarketing() {
        return marketing.listAll();
    }
}
