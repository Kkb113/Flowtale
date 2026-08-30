package com.sharefable.analytics.common;

public record DeviceAndGeoInfo(
  Boolean isMobile,
  Boolean isTablet,
  Boolean isSmartTv,
  Boolean isDesktopViewer,
  Boolean isIosViewer,
  Boolean isAndroidViewer,
  String country,
  String countryName,
  String countryRegion,
  String countryRegionName,
  String city,
  String postalCode,
  String timeZone,
  Double latitude,
  Double longitude,
  String address
) {
}
