package com.feldnstein.platform.economics;

import com.feldnstein.platform.economics.EconomicsService.ParamsForm;
import com.feldnstein.platform.economics.EconomicsService.SensitivityRow;
import com.feldnstein.platform.economics.EconomicsService.Snapshot;
import com.feldnstein.platform.gaanugu.settings.Audited;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Economics engine admin API (ADR-0020): the owner's absorption-pricing workbook
 * over live data — per-product cost parameters, material-cost feed from seed
 * procurement, oil-cake credits, margin-governed suggested/floor prices, and
 * ±20% material sensitivity. Thin driving adapter over {@link EconomicsService}.
 */
@Path("/g/economics")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class EconomicsResource {

    @Inject EconomicsService economics;

    public record ParamsRequest(Integer tripsPerDay, BigDecimal outputPct, BigDecimal rawMaterialKgPerTrip,
                                BigDecimal materialCostPerKgOverride, BigDecimal dailyWages,
                                Integer wageDaysPerYear, BigDecimal yearlyFodder,
                                BigDecimal bottlesPerLitre, Long bottleCostPaise,
                                BigDecimal shopAllocationPerYear, BigDecimal setupCost,
                                Integer depreciationYears) {}

    public record PriceRuleRequest(Long productId, BigDecimal targetMarginPct, BigDecimal minMarginPct) {}

    public record ByproductSaleRequest(Long productId, BigDecimal qtyKg, Long pricePerKgPaise,
                                       String buyer, Long batchId, Instant soldAt) {}

    public record SaleView(long id, long productId, Long batchId, BigDecimal qtyKg, long pricePerKgPaise,
                           String buyer, Instant soldAt, Instant createdAt) {}

    @GET
    @Path("/products")
    public Response products() {
        List<Snapshot> snapshots = ProductEconomics.<ProductEconomics>listAll().stream()
                .map(pe -> economics.snapshot(pe.product.id))
                .toList();
        return Response.ok(snapshots).build();
    }

    @GET
    @Path("/products/{productId}")
    public Response product(@PathParam("productId") long productId) {
        return Response.ok(economics.snapshot(productId)).build();
    }

    @PUT
    @Path("/products/{productId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Audited("ECONOMICS_PARAMS")
    public Response upsertParams(@PathParam("productId") long productId, ParamsRequest req) {
        Snapshot snapshot = economics.upsertParams(productId, new ParamsForm(
                req.tripsPerDay(), req.outputPct(), req.rawMaterialKgPerTrip(),
                req.materialCostPerKgOverride(), req.dailyWages(), req.wageDaysPerYear(),
                req.yearlyFodder(),
                req.bottlesPerLitre(), req.bottleCostPaise(), req.shopAllocationPerYear(),
                req.setupCost(), req.depreciationYears()));
        return Response.ok(snapshot).build();
    }

    @GET
    @Path("/products/{productId}/sensitivity")
    public Response sensitivity(@PathParam("productId") long productId) {
        List<SensitivityRow> rows = economics.sensitivity(productId);
        return Response.ok(rows).build();
    }

    @POST
    @Path("/price-rules")
    @Consumes(MediaType.APPLICATION_JSON)
    @Audited("PRICE_RULE")
    public Response setPriceRule(PriceRuleRequest req) {
        PriceRule rule = economics.setPriceRule(
                req.productId(), req.targetMarginPct(), req.minMarginPct());
        return Response.ok(rule).build();
    }

    @GET
    @Path("/byproduct-sales")
    public Response byproductSales(@QueryParam("productId") Long productId) {
        List<ByproductSale> sales = economics.listByproductSales(productId);
        return Response.ok(sales.stream().map(this::saleView).toList()).build();
    }

    @POST
    @Path("/byproduct-sales")
    @Consumes(MediaType.APPLICATION_JSON)
    @Audited("BYPRODUCT_SALE")
    public Response recordByproductSale(ByproductSaleRequest req) {
        ByproductSale sale = economics.recordByproductSale(
                req.productId(), req.qtyKg(), req.pricePerKgPaise(),
                req.buyer(), req.batchId(), req.soldAt());
        return Response.status(201).entity(saleView(sale)).build();
    }

    private SaleView saleView(ByproductSale sale) {
        return new SaleView(sale.id, sale.product.id, sale.batch != null ? sale.batch.id : null,
                sale.qtyKg, sale.pricePerKgPaise, sale.buyer, sale.soldAt, sale.createdAt);
    }
}
