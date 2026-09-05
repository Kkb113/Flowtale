package com.sharefable.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.config.AppConfig;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.repo.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicationRenameTest {
  private final S3Service storage = mock(S3Service.class);
  private final S3Config config = mock(S3Config.class);
  private final EntityService service = new EntityService(mock(DemoEntityRepo.class), mock(UserRepo.class),
    mock(AppSettings.class), storage, config, mock(ScreenRepo.class), mock(ScreenService.class),
    mock(UserService.class), mock(AppConfig.class), mock(EntityConfigService.class), mock(SubscriptionRepo.class), mock(PublicationLifecycle.class), mock(ProxyAssetDelivery.class));
  private final AssetFilePath source = AssetFilePath.builder().fullQualifiedPath("old/0_d_data.json").build();
  private final AssetFilePath target = AssetFilePath.builder().fullQualifiedPath("new/0_d_data.json").build();
  private final AssetFilePath manifest = AssetFilePath.builder().fullQualifiedPath("new/manifest.json").build();
  private final DemoEntity renamed = DemoEntity.builder().rid("new").displayName("New name")
    .description("New description").publishedVersion(9).build();

  private void paths() {
    when(config.getQualifiedPathFor(any(), eq("old"), anyString())).thenReturn(source);
    when(config.getQualifiedPathFor(any(), eq("new"), anyString())).thenReturn(target);
    when(config.getQualifiedPathFor(any(), eq("new"), eq("manifest.json"))).thenReturn(manifest);
  }

  @ParameterizedTest @EnumSource(TopLevelEntityType.class)
  void renamePreservesPublishedContentAndFiltersHistoricalPrivateFields(TopLevelEntityType type) throws Exception {
    paths();
    byte[] original = """
      {"status":"Success","data":{"rid":"old","displayName":"Old","description":"Old description",
       "pubDataFileName":"3_index.json","pubEditFileName":"3_edits.json","settings":{"theme":"published"},
       "createdBy":{"email":"private@example.invalid"},"info":{"productDetails":"private"},
       "cc":{"commonAssetPath":"https://assets.invalid/"},
       "screens":[{"rid":"screen","displayName":"Published screen","thumbnail":"thumb.png","uploadUrl":"private"}]}}
      """.getBytes(StandardCharsets.UTF_8);
    when(storage.getObjectContent(source)).thenReturn(original);
    service.renamePublishedMetadata("old", renamed, type);
    var bytes = org.mockito.ArgumentCaptor.forClass(byte[].class);
    verify(storage).upload(eq(target), bytes.capture(), anyMap());
    var published = new ObjectMapper().readTree(bytes.getValue()).path("data");
    assertEquals("new", published.path("rid").asText());
    assertEquals("New name", published.path("displayName").asText());
    assertEquals("New description", published.path("description").asText());
    assertEquals("3_index.json", published.path("pubDataFileName").asText());
    assertEquals("3_edits.json", published.path("pubEditFileName").asText());
    assertEquals("published", published.path("settings").path("theme").asText());
    assertFalse(published.toString().contains("private"));
    verify(storage, never()).copy(any(), any());
    if (type == TopLevelEntityType.TOUR) {
      verify(storage).upload(eq(manifest), bytes.capture(), anyMap());
      var exported = new ObjectMapper().readTree(bytes.getValue());
      assertEquals("New name", exported.path("name").asText());
      assertEquals("Published screen", exported.path("screenAssets").get(0).path("name").asText());
      assertEquals("https://assets.invalid/thumb.png", exported.path("screenAssets").get(0).path("thumbnail").asText());
    }
  }

  @Test void unreadablePublicationCannotBeReplacedWithDraftMetadata() throws Exception {
    paths();
    when(storage.getObjectContent(source)).thenThrow(new IOException("storage unavailable"));
    assertThrows(IOException.class, () -> service.renamePublishedMetadata("old", renamed, TopLevelEntityType.TOUR));
    verify(storage, never()).upload(any(), any(), anyMap());
    doReturn("[]".getBytes(StandardCharsets.UTF_8)).when(storage).getObjectContent(source);
    assertThrows(IOException.class, () -> service.renamePublishedMetadata("old", renamed, TopLevelEntityType.TOUR));
    verify(storage, never()).upload(any(), any(), anyMap());
  }
}
