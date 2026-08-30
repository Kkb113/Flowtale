package com.sharefable.api.config;

import com.sharefable.api.entity.Settings;
import com.sharefable.api.repo.AppSettingsRepo;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppSettingsTest {
  @Mock
  private AppSettingsRepo settingsRepo;

  @Test
  void parsesDefaultGlobalOptionsAsAnObject() {
    when(settingsRepo.findAll()).thenReturn(List.of(
      setting("CURRENT_SCHEMA_VERSION", "2023-01-10"),
      setting("FEATURE_PLAN_MATRIX", "{}"),
      setting("DEFAULT_GLOBAL_OPTS", "{\"annConPad\":\"14 14\",\"showStepNo\":true}")
    ));

    AppSettings appSettings = new AppSettings(settingsRepo);

    Assertions.assertEquals("14 14", appSettings.getGlobalOpts().get("annConPad"));
    Assertions.assertEquals(true, appSettings.getGlobalOpts().get("showStepNo"));
  }

  @Test
  void usesAnEmptyObjectWhenDefaultGlobalOptionsAreMissing() {
    when(settingsRepo.findAll()).thenReturn(List.of(
      setting("CURRENT_SCHEMA_VERSION", "2023-01-10"),
      setting("FEATURE_PLAN_MATRIX", "{}")
    ));

    AppSettings appSettings = new AppSettings(settingsRepo);

    Assertions.assertTrue(appSettings.getGlobalOpts().isEmpty());
  }

  private Settings setting(String key, String value) {
    return Settings.builder().k(key).v(value).build();
  }
}
