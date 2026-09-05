package com.sharefable.api.service;

import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.req.ReqRenameGeneric;
import com.sharefable.api.transport.req.ReqUpdateScreenProperty;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ScreenMutationLockTest {
  @Test void metadataMutationsReadTheLockedScreenAndPreserveItsOtherFields() {
    ScreenRepo screens = mock(ScreenRepo.class);
    ScreenService service = new ScreenService(screens, mock(S3Service.class), mock(S3Config.class),
      mock(DemoEntityRepo.class), mock(AppSettings.class), mock(ProxyAssetDelivery.class));
    ReflectionTestUtils.setField(service, "entityManager", mock(EntityManager.class));
    User user = User.builder().belongsToOrg(7L).build();
    Screen current = Screen.builder().id(1L).rid("screen").belongsToOrg(7L).createdBy(user)
      .displayName("Original").thumbnail("latest-thumbnail").responsive(false).build();
    when(screens.findByRidForUpdate("screen")).thenReturn(Optional.of(current));
    when(screens.save(current)).thenReturn(current);
    service.updateScreenProperty(new ReqUpdateScreenProperty("screen", "responsive", true), user);
    service.renameScreen(new ReqRenameGeneric("Renamed", Optional.empty(), "screen"), user);
    assertEquals("latest-thumbnail", current.getThumbnail());
    assertTrue(current.getResponsive());
    assertEquals("Renamed", current.getDisplayName());
    verify(screens, times(2)).findByRidForUpdate("screen");
    verify(screens, never()).findByRid(anyString());
  }

  @Test void aForeignWorkspaceCannotMutateALockedScreen() {
    ScreenRepo screens = mock(ScreenRepo.class);
    ScreenService service = new ScreenService(screens, mock(S3Service.class), mock(S3Config.class),
      mock(DemoEntityRepo.class), mock(AppSettings.class), mock(ProxyAssetDelivery.class));
    when(screens.findByRidForUpdate("screen")).thenReturn(Optional.of(
      Screen.builder().rid("screen").belongsToOrg(8L).build()));
    assertThrows(ResponseStatusException.class, () -> service.updateScreenProperty(
      new ReqUpdateScreenProperty("screen", "responsive", true), User.builder().belongsToOrg(7L).build()));
    verify(screens, never()).save(any());
  }
}
