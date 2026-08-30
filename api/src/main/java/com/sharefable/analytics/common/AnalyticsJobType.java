package com.sharefable.analytics.common;


import com.sharefable.api.transport.GenerateTSDef;

@GenerateTSDef
public enum AnalyticsJobType {
  REFRESH_ENTITY_METRICS_MATERIALIZED_VIEW,
  CALCULATE_ENTITY_SUB_ENTITY_METRICS,
  UPDATE_HOUSE_LEAD,
  CALCULATE_HOUSE_LEAD_METRICS,
  ACTIVITY_DT_DATA_TRUNCATE,
  REFRESH_DAILY_ENTITY_METRICS
}
