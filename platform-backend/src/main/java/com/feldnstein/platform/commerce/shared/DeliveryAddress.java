package com.feldnstein.platform.commerce.shared;

/** Where an order must be delivered — validated on construction. */
public record DeliveryAddress(String addressLine, String city, String state, String pincode) {

    public DeliveryAddress {
        if (addressLine == null || addressLine.trim().length() < 5)
            throw new DomainException("address is required");
        if (city == null || city.isBlank()) throw new DomainException("city is required");
        if (state == null || state.isBlank()) throw new DomainException("state is required");
        if (pincode == null || !pincode.matches("^[0-9]{6}$"))
            throw new DomainException("a valid 6-digit pincode is required");
        addressLine = addressLine.trim();
        city = city.trim();
        state = state.trim();
    }

    public String display() {
        return addressLine + ", " + city + ", " + state + " - " + pincode;
    }
}
