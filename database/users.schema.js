db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      additionalProperties: false,
      required: [
        "_id",
        "fullName",
        "email",
        "passwordHash",
        "role",
        "status",
        "createdAt",
        "updatedAt"
      ],
      properties: {
        _id: {
          bsonType: "string",
          description: "User UUID must be a string and is required"
        },
        fullName: {
          bsonType: "string",
          minLength: 1,
          maxLength: 120,
          description: "User full name is required"
        },
        phone: {
          bsonType: ["string", "null"],
          minLength: 8,
          maxLength: 20,
          description: "Phone number is required"
        },
        email: {
          bsonType: "string",
          maxLength: 254,
          description: "Email is optional but must be a string or null"
        },
        passwordHash: {
          bsonType: "string",
          description: "Hashed password is required"
        },
        address: {
          bsonType: ["string", "null"],
          description: "Home address is optional"
        },
        height: {
          bsonType: ["string", "null"],
          description: "Height is optional"
        },
        weight: {
          bsonType: ["string", "null"],
          description: "Weight is optional"
        },
        role: {
          enum: ["PIN", "HELPER", "BOTH"],
          description: "Allowed roles are PIN, HELPER, BOTH"
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
          bsonType: "object",
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
        emergencyContactUserIds: {
          bsonType: "array",
          minItems: 0,
          maxItems: 5,
          uniqueItems: true,
          items: {
            bsonType: "string"
          },
          description: "Up to 5 emergency contact UUIDs"
        },
        helperProfile: {
          bsonType: "object",
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
          bsonType: "date",
          description: "Creation timestamp is required"
        },
        updatedAt: {
          bsonType: "date",
          description: "Update timestamp is required"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});