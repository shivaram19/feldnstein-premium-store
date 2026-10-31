package com.feldnstein.platform.media;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.feldnstein.platform.gaanugu.OilProduct;
import com.feldnstein.platform.gaanugu.PriceConfig;
import com.feldnstein.platform.gaanugu.ProductVariant;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.*;

@Path("/site")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
public class SiteResource {

    @Inject ContentBlockRepository blocks;
    @Inject ProductMarketingRepository marketing;
    @Inject MediaService mediaService;
    @Inject ObjectMapper mapper;

    private record CacheEntry(Object body, Instant expires) {}
    private volatile CacheEntry productsCache;
    private volatile CacheEntry contentCache;
    private static final long TTL_SECONDS = 60;

    @GET
    @Path("/products")
    public Response products() {
        CacheEntry cached = productsCache;
        if (cached != null && cached.expires().isAfter(Instant.now())) {
            return ok(cached.body());
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (OilProduct p : OilProduct.<OilProduct>list("active", true)) {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id", p.id);
            pm.put("code", p.code);
            pm.put("name", p.name);
            pm.put("oilSource", p.oilSource.name());
            ProductMarketing mkt = marketing.find("product.id", p.id).firstResult();
            if (mkt != null) {
                if (mkt.badge != null) pm.put("badge", mkt.badge);
                if (mkt.shortDesc != null) pm.put("shortDesc", mkt.shortDesc);
                if (mkt.longDesc != null) pm.put("longDesc", mkt.longDesc);
                if (mkt.cardAsset != null && mkt.cardAsset.status == MediaAsset.Status.PUBLISHED) {
                    pm.put("imageUrl", mediaService.variantUrl(mkt.cardAsset, "card"));
                    pm.put("imageThumbUrl", mediaService.variantUrl(mkt.cardAsset, "thumb"));
                    pm.put("imageAlt", mkt.cardAsset.altText == null ? p.name : mkt.cardAsset.altText);
                }
            }
            List<Map<String, Object>> varOut = new ArrayList<>();
            for (ProductVariant v : ProductVariant.<ProductVariant>list("product", p)) {
                Map<String, Object> vm = new LinkedHashMap<>();
                vm.put("id", v.id);
                vm.put("sku", v.sku);
                vm.put("sizeMl", v.sizeMl);
                PriceConfig price = PriceConfig.<PriceConfig>find(
                        "variant = ?1 and priceType = ?2 and active", v,
                        PriceConfig.PriceType.SELLING).firstResult();
                if (price != null) {
                    vm.put("price", price.amount);
                    vm.put("gstPct", price.gstPct);
                    vm.put("priceInclGst", price.amountInclGst());
                }
                varOut.add(vm);
            }
            pm.put("variants", varOut);
            out.add(pm);
        }
        productsCache = new CacheEntry(out, Instant.now().plusSeconds(TTL_SECONDS));
        return ok(out);
    }

    @GET
    @Path("/content")
    public Response content() {
        CacheEntry cached = contentCache;
        if (cached != null && cached.expires().isAfter(Instant.now())) {
            return ok(cached.body());
        }
        Map<String, JsonNode> out = new LinkedHashMap<>();
        for (ContentBlock b : blocks.listAll()) {
            try {
                out.put(b.blockKey, mapper.readTree(b.payload));
            } catch (Exception ignored) { /* skip malformed */ }
        }
        contentCache = new CacheEntry(out, Instant.now().plusSeconds(TTL_SECONDS));
        return ok(out);
    }

    /** Public, cache-immutable media byte serving. */
    @GET
    @Path("/media/file/{key:.+}")
    @Produces("image/jpeg")
    public Response file(@PathParam("key") String key) {
        byte[] bytes;
        try {
            bytes = mediaService.read(key);
        } catch (MediaObjectNotFoundException e) {
            throw new NotFoundException("media not found");
        }
        return Response.ok(bytes)
                .type("image/jpeg")
                .header("Cache-Control", "public, max-age=86400, immutable")
                .build();
    }

    /** Public metadata for one published asset (storefront previews). */
    @GET
    @Path("/media/{assetKey:.+}")
    public Map<String, Object> media(@PathParam("assetKey") String assetKey) {
        MediaAsset a = MediaAsset.<MediaAsset>find("assetKey", assetKey).firstResult();
        if (a == null || a.status != MediaAsset.Status.PUBLISHED) throw new NotFoundException("media not found");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("assetKey", a.assetKey);
        out.put("altText", a.altText == null ? "" : a.altText);
        out.put("variants", mediaService.variantUrls(a));
        return out;
    }

    private Response ok(Object body) {
        return Response.ok(body)
                .header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
                .build();
    }
}
