package com.feldnstein.platform.gaanugu;

import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Map;

/** On-demand alert regeneration (the timer also runs every 60s). */
@Path("/g/alerts-ops")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "OPERATOR"})
public class AlertOpsResource {

    private final AlertEvaluator evaluator;

    public AlertOpsResource(AlertEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    @POST
    @Path("/regenerate")
    public Map<String, Object> regenerate() {
        evaluator.regenerate();
        long open = Alert.count("status", Alert.AlertStatus.OPEN);
        return Map.of("openAlerts", open);
    }
}
