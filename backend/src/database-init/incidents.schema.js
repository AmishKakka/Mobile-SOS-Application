db.createCollection("incidents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      additionalProperties: false,
      required: [
        "_id",
        "personInNeedId",
        "incidentType",
        "status",
        "triggerSource",
        "responseMode",
        "startedAt",
        "locationSnapshot",
        "helpers",
        "emergencyContactsNotified",
        "createdAt",
        "updatedAt"
      ],
      properties: {
        _id: {
          bsonType: "string",
          description: "Incident UUID must be a string and is required"
        },
        personInNeedId: {
          bsonType: "string",
          description: "PIN user UUID is required"
        },
        incidentType: {
          enum: ["MEDICAL", "CRIME", "FIRE", "ACCIDENT", "OTHER"],
          description: "Allowed incident types"
        },
        status: {
          enum: ["OPEN", "MATCHING", "ESCALATED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
          description: "Allowed incident statuses"
        },
        triggerSource: {
          enum: ["BUTTON", "VOICE", "AUTO_DETECTION", "MANUAL"],
          description: "How the SOS was triggered"
        },
        responseMode: {
          enum: ["HELPERS", "POLICE", "AMBULANCE", "CONTACTS_ONLY", "MIXED"],
          description: "How this incident was handled"
        },
        startedAt: {
          bsonType: "date"
        },
        endedAt: {
          bsonType: ["date", "null"]
        },
        resolution: {
          bsonType: ["string", "null"],
          enum: [
            "HELPER_RESOLVED",
            "POLICE_HANDLED",
            "AMBULANCE_HANDLED",
            "CONTACTS_HANDLED",
            "FALSE_ALARM",
            "CANCELLED",
            "EXTERNALLY_HANDLED",
            null
          ]
        },
        locationSnapshot: {
          bsonType: "object",
          additionalProperties: false,
          required: ["h3Cell"],
          properties: {
            h3Cell: {
              bsonType: "string",
              minLength: 1,
              maxLength: 32
            }
          }
        },
        helpers: {
          bsonType: "array",
          description: "Can be empty if police/ambulance/others handled the incident",
          items: {
            bsonType: "object",
            additionalProperties: false,
            required: ["helperId", "status", "assignedAt", "respondedAt", "arrivedAt"],
            properties: {
              helperId: {
                bsonType: "string"
              },
              status: {
                enum: ["ASSIGNED", "ACCEPTED", "DECLINED", "ARRIVED", "CANCELLED", "NO_RESPONSE"]
              },
              assignedAt: {
                bsonType: ["date", "null"]
              },
              respondedAt: {
                bsonType: ["date", "null"]
              },
              arrivedAt: {
                bsonType: ["date", "null"]
              }
            }
          }
        },
        externalSupport: {
          bsonType: ["object", "null"],
          additionalProperties: false,
          properties: {
            handledBy: {
              bsonType: ["string", "null"],
              enum: ["POLICE", "AMBULANCE", "SECURITY", "FIRE_DEPARTMENT", "OTHER", null]
            },
            contacted: {
              bsonType: ["bool", "null"]
            },
            contactedAt: {
              bsonType: ["date", "null"]
            },
            status: {
              bsonType: ["string", "null"],
              enum: ["PENDING", "DISPATCHED", "ARRIVED", "COMPLETED", null]
            }
          }
        },
        emergencyContactsNotified: {
          bsonType: "array",
          items: {
            bsonType: "string"
          }
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});