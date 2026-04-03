db.users.createIndex({ phone: 1 }, { unique: true });

db.users.createIndex({ email: 1 }, { unique: true, sparse: true });

db.incidents.createIndex({ personInNeedId: 1, startedAt: -1 });

db.incidents.createIndex({ "helpers.helperId": 1, startedAt: -1 });

db.incidents.createIndex({ status: 1, startedAt: -1 });
