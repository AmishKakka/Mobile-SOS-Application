db.createCollection("incident_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      additionalProperties: false,
      required: ["_id", "incidentId", "eventType", "ts", "severity", "ruleVersion", "details", "location", "createdAt"],
      properties: {
        _id: {
          bsonType: "string"
        },
        incidentId: {
          bsonType: "string"
        },
        helperId: {
          bsonType: ["string", "null"]
        },
        eventType: {
          bsonType: "string",
          enum: [
            "INCIDENT_CREATED",
            "HELPER_ASSIGNED",
            "HELPER_ACCEPTED",
            "HELPER_DECLINED",
            "HELPER_CANCELLED",
            "STOP_STARTED",
            "STOP_PROLONGED",
            "STOP_ENDED",
            "ARRIVED",
            "LOCATION_GAP",
            "TRACKING_RESUMED",
            "INCIDENT_CANCELLED",
            "INCIDENT_COMPLETED"
          ]
        },
        ts: {
          bsonType: "date"
        },
        location: {
          bsonType: "object",
          additionalProperties: false,
          required: ["lat", "lng"],
          properties: {
            lat: { bsonType: ["number", "null"] },
            lng: { bsonType: ["number", "null"] }
          }
        },
        details: {
          bsonType: "object"
        },
        severity: {
          bsonType: "string",
          enum: ["INFO", "MEDIUM", "HIGH"]
        },
        ruleVersion: {
          bsonType: "string"
        },
        createdAt: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
