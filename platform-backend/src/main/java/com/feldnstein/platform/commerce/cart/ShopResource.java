package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.commerce.order.CheckoutService;
import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.order.OrderViews;
import com.feldnstein.platform.commerce.payment.PaymentService;
import com.feldnstein.platform.commerce.shared.DomainException;
import com.feldnstein.platform.loyalty.LoyaltyAccount;
import com.feldnstein.platform.loyalty.LoyaltyService;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * Public storefront API — thin driving adapter. All behaviour lives in the
 * application services and the aggregates; this class only maps HTTP.
 */
@Path("/shop")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@PermitAll
public class ShopResource {

    @Inject CartService carts;
    @Inject CheckoutService checkout;
    @Inject PaymentService payments;
    @Inject OrderViews views;
    @Inject LoyaltyService loyalty;

    public record QtyRequest(Integer qty) {}

    public record AddRequest(Long variantId, Integer qty) {}

    @GET
    @Path("/cart")
    public Response cart(@HeaderParam(CartService.TOKEN_HEADER) String token) {
        Cart cart = carts.resolve(token);
        if (cart == null) return Response.ok(Map.of("lines", java.util.List.of(), "itemCount", 0,
                "subTotal", 0, "gstTotal", 0, "grandTotal", 0)).build();
        return Response.ok(carts.view(cart)).build();
    }

    @POST
    @Path("/cart/add")
    @Transactional
    public Response add(@HeaderParam(CartService.TOKEN_HEADER) String token, AddRequest body) {
        if (body == null || body.variantId() == null || body.qty() == null)
            return bad("variantId and qty are required");
        if (body.qty() <= 0) return bad("qty must be positive");
        Cart cart = carts.resolve(token);
        if (cart == null) cart = carts.create();
        // E-commerce convention (ADR-0022): add increments the existing line; absolute set lives on PUT.
        int current = cart.lines().stream()
                .filter(i -> i.variant().id.equals(body.variantId()))
                .mapToInt(i -> i.qty()).sum();
        String rejected = carts.setItem(cart, body.variantId(), current + body.qty());
        if (rejected != null) return Response.status(400).entity(Map.of("error", rejected)).build();
        Map<String, Object> view = carts.view(cart);
        return Response.status(token == null ? 201 : 200).entity(view).build();
    }

    @PUT
    @Path("/cart/items/{variantId}")
    @Transactional
    public Response updateItem(@HeaderParam(CartService.TOKEN_HEADER) String token,
                               @PathParam("variantId") Long variantId, QtyRequest body) {
        Cart cart = carts.resolve(token);
        if (cart == null) return bad("cart not found");
        if (body == null || body.qty() == null) return bad("qty is required");
        String rejected = carts.setItem(cart, variantId, body.qty());
        if (rejected != null) return Response.status(400).entity(Map.of("error", rejected)).build();
        return Response.ok(carts.view(cart)).build();
    }

    @DELETE
    @Path("/cart/items/{variantId}")
    @Transactional
    public Response removeItem(@HeaderParam(CartService.TOKEN_HEADER) String token,
                               @PathParam("variantId") Long variantId) {
        Cart cart = carts.resolve(token);
        if (cart == null) return bad("cart not found");
        carts.setItem(cart, variantId, 0);
        return Response.ok(carts.view(cart)).build();
    }

    public record CheckoutRequest(String customerName, String email, String phone,
                                  String address, String city, String state, String pincode,
                                  Integer pointsToRedeem) {}

    @POST
    @Path("/checkout")
    @Transactional
    public Response checkout(@HeaderParam(CartService.TOKEN_HEADER) String token, CheckoutRequest body) {
        Cart cart = carts.resolve(token);
        if (cart == null) return bad("cart not found or expired");
        try {
            CustomerOrder order = checkout.place(cart, new CheckoutService.CheckoutForm(
                    body.customerName(), body.email(), body.phone(),
                    body.address(), body.city(), body.state(), body.pincode(),
                    body.pointsToRedeem()));
            return Response.status(201).entity(checkout.receipt(order)).build();
        } catch (DomainException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    /** Demo payment capture — completes the purchase without a live gateway. */
    @POST
    @Path("/payments/{orderCode}/demo-pay")
    @Transactional
    public Response demoPay(@PathParam("orderCode") String code) {
        if (!payments.demoMode())
            return Response.status(400).entity(Map.of("error", "demo payments are disabled on this deployment")).build();
        CustomerOrder order = CustomerOrder.findByCode(code);
        if (order == null) return Response.status(404).entity(Map.of("error", "order not found")).build();
        payments.demoCapture(order);
        return Response.ok(views.detail(order)).build();
    }

    public record VerifyRequest(String orderCode, String razorpayPaymentId, String razorpaySignature) {}

    /** Verify a Razorpay checkout callback (HMAC-SHA256) and mark the order paid. */
    @POST
    @Path("/payments/verify")
    @Transactional
    public Response verify(VerifyRequest body) {
        if (body == null || body.orderCode() == null)
            return bad("orderCode is required");
        if (payments.demoMode())
            return bad("signature verification is only used with the razorpay provider");
        CustomerOrder order = CustomerOrder.findByCode(body.orderCode().trim());
        if (order == null) return Response.status(404).entity(Map.of("error", "order not found")).build();
        try {
            payments.verifyPayment(order, body.razorpayPaymentId(), body.razorpaySignature());
            return Response.ok(views.detail(order)).build();
        } catch (DomainException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    public record LookupRequest(String orderCode, String email) {}

    /** Order tracking: code + email, customer-facing status timeline. */
    @POST
    @Path("/orders/lookup")
    public Response lookup(LookupRequest body) {
        if (body == null || body.orderCode() == null || body.email() == null)
            return bad("orderCode and email are required");
        CustomerOrder order = CustomerOrder.findByCode(body.orderCode().trim());
        if (order == null || !order.email().equalsIgnoreCase(body.email().trim()))
            return Response.status(404).entity(Map.of("error", "no order found for that code and email")).build();
        Map<String, Object> view = views.detail(order);
        view.remove("payment");
        return Response.ok(view).build();
    }

    /** Loyalty balance — authorised by an existing order matching code + email. */
    @GET
    @Path("/loyalty/balance")
    public Response loyaltyBalance(@QueryParam("email") String email,
                                   @QueryParam("orderCode") String orderCode) {
        if (email == null || email.isBlank() || orderCode == null || orderCode.isBlank())
            return bad("email and orderCode are required");
        CustomerOrder order = CustomerOrder.findByCode(orderCode.trim());
        if (order == null || !order.email().equalsIgnoreCase(email.trim()))
            return Response.status(404).entity(Map.of("error", "no order found for that code and email")).build();
        return Response.ok(loyalty.balance(LoyaltyAccount.findByEmail(email), email)).build();
    }

    private static Response bad(String msg) {
        return Response.status(400).entity(Map.of("error", msg)).build();
    }
}
