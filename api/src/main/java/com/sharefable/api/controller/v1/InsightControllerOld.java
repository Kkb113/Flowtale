package com.sharefable.api.controller.v1;

import com.sharefable.Routes;
import com.sharefable.api.service.FirehoseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
@RequiredArgsConstructor
@RequestMapping(Routes.API_V1)
@Slf4j
public class InsightControllerOld {
  private final FirehoseService firehoseService;

  @RequestMapping(value = Routes.LOG_USER_EVENTS, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public void sendEvents(@RequestParam("sub") String encodedSub, @RequestBody String userEventLogs) {
    String dSub = URLDecoder.decode(encodedSub, StandardCharsets.UTF_8);
    String sub = new String(Base64.getDecoder().decode(dSub));
    firehoseService.sendEventsToFirehose(sub, userEventLogs);
  }
}
