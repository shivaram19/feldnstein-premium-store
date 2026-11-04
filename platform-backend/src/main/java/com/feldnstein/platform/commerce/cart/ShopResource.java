package com.feldnstein.platform.commerce.cart;

import com.feldnstein.platform.commerce.order.CustomerOrder;
import com.feldnstein.platform.commerce.order.OrderService;
import com.feldnstein.platform.commerce.payment.PaymentService;
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
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/** Public storefront API: cart, checkout, demo payment, order tracking. Anonymous. */
@Path("/shop")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@PermitAll
public class ShopResource {

    @Inject CartService carts;
    @Inject OrderService orders;
    @Inject PaymentService payments;

    public record QtyRequest(Integer qty) {}

    @GET
    @Path("/cart")
    public Response cart(@HeaderParam(CartService.TOKEN_HEADER) String token) {
        Cart cart = carts.resolve(token);
        if (cart == null) return Response.ok(Map.of("lines", java.util.List.of(), "itemCount", 0,
                "subTotal", 0, "gstTotal", 0, "grandTotal", 0)).build();
        return Response.ok(carts.view(cart)).build();
    }

    public record AddRequest(Long variantId, Integer qty) {}

    @POST
    @Path("/cart/add")
    @Transactional
    public Response add(@HeaderParam(CartService.TOKEN_HEADER) String token, AddRequest body) {
        if (body == null || body.variantId() == null || body.qty() == null)
            return bad("variantId and qty are required");
        if (body.qty() <= 0) return bad("qty must be positive");
        Cart cart = carts.resolve(token);
        if (cart == null) cart = carts.create();
        String rejected = carts.setItem(cart, body.variantId(), body.qty());
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
                                  String address, String city, String state, String pincode) {}

    @POST
    @Path("/checkout")
    @Transactional
    public Response checkout(@HeaderParam(CartService.TOKEN_HEADER) String token, CheckoutRequest body) {
        Cart cart = carts.resolve(token);
        if (cart == null) return bad("cart not found or expired");
        Map<String, Object> result = orders.checkout(cart, new OrderService.CheckoutForm(
                body.customerName(), body.email(), body.phone(),
                body.address(), body.city(), body.state(), body.pincode()));
        if (result.containsKey("error")) return Response.status(400).entity(result).build();
        return Response.status(201).entity(result).build();
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
        return Response.ok(orders.view(order)).build();
    }

    public record LookupRequest(String orderCode, String email) {}

    /** Order tracking: code + email, customer-facing status timeline. */
    @POST
    @Path("/orders/lookup")
    public Response lookup(LookupRequest body) {
        if (body == null || body.orderCode() == null || body.email() == null)
            return bad("orderCode and email are required");
        CustomerOrder order = CustomerOrder.findByCode(body.orderCode().trim());
        if (order == null || !order.email.equalsIgnoreCase(body.email().trim()))
            return Response.status(404).entity(Map.of("error", "no order found for that code and email")).build();
        Map<String, Object> view = orders.view(order);
        view.remove("payment");
        return Response.ok(view).build();
    }

    private static Response bad(String msg) {
        return Response.status(400).entity(Map.of("error", msg)).build();
    }
}
