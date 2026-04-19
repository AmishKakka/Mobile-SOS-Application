db.createCollection("incident_helper_tracks_ts", {
  timeseries: {
    timeField: "ts",
    metaField: "meta",
    granularity: "seconds"
  },
  expireAfterSeconds: 2592000
});
