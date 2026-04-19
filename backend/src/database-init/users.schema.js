const usersValidator = {
  $jsonSchema: {
    bsonType: "object",
    additionalProperties: false,
    required: [
      "_id",
      "cognitoId",
      "firstName",
      "lastName",
      "email",
      "status",
      "createdAt",
      "updatedAt"
    ],
    properties: {
      _id: {
        bsonType: "string",
        description: "User id must be a string."
      },
      cognitoId: {
        bsonType: "string",
        description: "AWS Cognito Unique ID is required."
      },
      firstName: {
        bsonType: "string",
        minLength: 1,
        maxLength: 120
      },
      lastName: {
        bsonType: "string",
        minLength: 1,
        maxLength: 120
      },
      email: {
        bsonType: "string",
        maxLength: 254
      },
      name: {
        bsonType: ["string", "null"],
        maxLength: 240
      },
      phone: {
        bsonType: ["string", "null"],
        minLength: 8,
        maxLength: 20
      },
      address: {
        bsonType: ["string", "null"]
      },
      height: {
        bsonType: ["string", "null"]
      },
      weight: {
        bsonType: ["string", "null"]
      },
      role: {
        bsonType: ["string", "null"],
        enum: ["victim", "helper", "both", "contact", null]
      },
      fcmToken: {
        bsonType: ["string", "null"]
      },
      isHelperAvailable: {
        bsonType: ["bool", "null"]
      },
      lastKnownLocation: {
        bsonType: ["object", "null"],
        additionalProperties: false,
        required: ["lat", "lng", "updatedAt"],
        properties: {
          lat: {
            bsonType: "number"
          },
          lng: {
            bsonType: "number"
          },
          updatedAt: {
            bsonType: "date"
          }
        }
      },
      status: {
        bsonType: "object",
        additionalProperties: false,
        required: ["isActive", "isVerified"],
        properties: {
          isActive: {
            bsonType: "bool"
          },
          isVerified: {
            bsonType: "bool"
          }
        }
      },
      medical: {
        bsonType: ["object", "null"],
        additionalProperties: false,
        required: ["bloodGroup", "allergies", "conditions", "medications", "notes"],
        properties: {
          bloodGroup: {
            bsonType: ["string", "null"],
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null]
          },
          allergies: {
            bsonType: "array",
            items: {
              bsonType: "string"
            }
          },
          conditions: {
            bsonType: "array",
            items: {
              bsonType: "string"
            }
          },
          medications: {
            bsonType: "array",
            items: {
              bsonType: "string"
            }
          },
          notes: {
            bsonType: ["string", "null"],
            maxLength: 500
          }
        }
      },
      emergencyContacts: {
        bsonType: ["array", "null"],
        minItems: 0,
        maxItems: 5,
        items: {
          bsonType: "object",
          required: ["name", "phone"],
          additionalProperties: false,
          properties: {
            name: {
              bsonType: "string"
            },
            relation: {
              bsonType: ["string", "null"]
            },
            phone: {
              bsonType: "string"
            }
          }
        }
      },
      helperProfile: {
        bsonType: ["object", "null"],
        additionalProperties: false,
        required: ["isHelper", "skills", "isAvailableForSOS"],
        properties: {
          isHelper: {
            bsonType: "bool"
          },
          skills: {
            bsonType: "array",
            items: {
              bsonType: "string"
            }
          },
          isAvailableForSOS: {
            bsonType: "bool"
          }
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
};