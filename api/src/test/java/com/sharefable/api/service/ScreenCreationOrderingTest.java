package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.ScreenType;
import com.sharefable.api.transport.req.ReqNewScreen;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.net.URL;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ScreenCreationOrderingTest {
  @Test void failedImageDocumentUploadCannotCommitAScreenOnAnotherThread() throws Exception {
    ScreenRepo screens = mock(ScreenRepo.class);
    S3Service storage = mock(S3Service.class);
    S3Config config = mock(S3Config.class);
    AssetFilePath path = AssetFilePath.builder().bucketName("fixture").regionName("us-east-1")
      .fullQualifiedPath("screen/image.png").build();
    when(config.getQualifiedPathFor(any(), anyString(), anyString())).thenReturn(path);
    when(storage.preSignedUrl(any(), anyString())).thenReturn(new URL("https://fixture.invalid/upload"));
    Thread caller = Thread.currentThread();
    when(storage.upload(any(), any(byte[].class), anyMap())).thenAnswer(call -> {
      assertSame(caller, Thread.currentThread(), "The document and entity must use the caller's transaction thread");
      throw new IllegalStateException("Fixture storage outage");
    });
    ScreenService service = new ScreenService(screens, storage, config, mock(DemoEntityRepo.class), mock(AppSettings.class), mock(ProxyAssetDelivery.class));
    String document = "{\"docTree\":{\"chldrn\":[{},{},{\"chldrn\":[{},{\"name\":\"img\",\"attrs\":{}}]}]}}";
    ReqNewScreen request = new ReqNewScreen("Fixture", Optional.empty(), Optional.empty(), Optional.empty(),
      ScreenType.Img, Optional.of("image/png"), document);
    assertThrows(ResponseStatusException.class, () -> service.createNewScreen(request, User.builder().belongsToOrg(7L).build()));
    verify(storage).upload(any(), any(byte[].class), anyMap());
    verifyNoInteractions(screens);
  }
}
