package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.TourDeleted;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DraftAssetServiceTest {
  final DemoEntityRepo demos = mock(DemoEntityRepo.class);
  final ScreenRepo screens = mock(ScreenRepo.class);
  final S3Config config = mock(S3Config.class);
  final S3Service storage = mock(S3Service.class);
  final DraftAssetService service = new DraftAssetService(demos, screens, config, storage);
  final User user = User.builder().belongsToOrg(7L).build();

  @ParameterizedTest @ValueSource(strings = {"tour", "screen", "hub"})
  void readsOnlyTheAuthorizedResourceAndAllowedFilename(String kind) throws Exception {
    when(screens.findByRid("owned")).thenReturn(Optional.of(Screen.builder().belongsToOrg(7L).assetPrefixHash("source").build()));
    when(demos.findByRid("owned")).thenReturn(Optional.of(DemoEntity.builder().belongsToOrg(7L)
      .deleted(TourDeleted.ACTIVE).entityType(kind.equals("hub") ? TopLevelEntityType.DEMO_HUB : TopLevelEntityType.TOUR)
      .assetPrefixHash("source").build()));
    AssetFilePath path = AssetFilePath.builder().fullQualifiedPath("resolved-by-server").build();
    when(config.getQualifiedPathFor(any(), eq("source"), eq("index.json"))).thenReturn(path);
    when(storage.getObjectContent(path)).thenReturn(new byte[] {1, 2, 3});
    assertArrayEquals(new byte[] {1, 2, 3}, service.read(kind, "owned", "index.json", user));
    verify(storage).getObjectContent(path);
  }

  @Test void foreignDeletedAndWrongTypeDraftsAreIndistinguishableFromMissingDrafts() {
    for (DemoEntity entity : new DemoEntity[] {
      DemoEntity.builder().belongsToOrg(8L).deleted(TourDeleted.ACTIVE).entityType(TopLevelEntityType.TOUR).build(),
      DemoEntity.builder().belongsToOrg(7L).deleted(TourDeleted.DELETED).entityType(TopLevelEntityType.TOUR).build(),
      DemoEntity.builder().belongsToOrg(7L).deleted(TourDeleted.ACTIVE).entityType(TopLevelEntityType.DEMO_HUB).build(),
    }) {
      when(demos.findByRid("target")).thenReturn(Optional.of(entity));
      assertEquals(404, assertThrows(ResponseStatusException.class,
        () -> service.read("tour", "target", "index.json", user)).getStatusCode().value());
    }
    when(screens.findByRid("target")).thenReturn(Optional.of(Screen.builder().belongsToOrg(8L).build()));
    assertThrows(ResponseStatusException.class, () -> service.read("screen", "target", "index.json", user));
    verifyNoInteractions(storage, config);
  }

  @Test void callerCannotChooseAnArbitraryStorageFileOrResourceKind() {
    for (String file : new String[] {"../index.json", "1_index.json", "index.img", "secret", "index.json/extra"}) {
      assertThrows(ResponseStatusException.class, () -> service.read("tour", "owned", file, user));
    }
    assertThrows(ResponseStatusException.class, () -> service.read("bucket", "owned", "index.json", user));
    assertThrows(ResponseStatusException.class, () -> service.read("hub", "owned", "loader.json", user));
    verifyNoInteractions(demos, screens, storage, config);
  }

  @Test void imageBytesRequireTheOwnedImageScreen() throws Exception {
    var image = Screen.builder().belongsToOrg(7L).assetPrefixHash("owned-image")
      .type(com.sharefable.api.transport.ScreenType.Img).build();
    when(screens.findByRid("image")).thenReturn(Optional.of(image));
    var path = AssetFilePath.builder().privateFile(true).fullQualifiedPath("private-image").build();
    when(config.getQualifiedPathFor(S3Config.AssetType.Screen, "owned-image", "index.img")).thenReturn(path);
    when(storage.getObjectContent(path)).thenReturn(new byte[] {42});
    assertArrayEquals(new byte[] {42}, service.read("screen", "image", "index.img", user));
    image.setBelongsToOrg(8L);
    assertThrows(ResponseStatusException.class, () -> service.read("screen", "image", "index.img", user));
    image.setBelongsToOrg(7L);
    image.setType(com.sharefable.api.transport.ScreenType.SerDom);
    assertThrows(ResponseStatusException.class, () -> service.read("screen", "image", "index.img", user));
    verify(storage, times(1)).getObjectContent(path);
  }
}
