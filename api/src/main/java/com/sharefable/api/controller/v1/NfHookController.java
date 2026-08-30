package com.sharefable.api.controller.v1;

import com.sharefable.Routes;
import com.sharefable.api.service.NfHookService;
import com.sharefable.api.transport.req.ReqNfHook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class NfHookController {
  private final NfHookService nfHookService;

  @RequestMapping(value = Routes.NF_HOOK, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public String processNfEvent(@RequestBody ReqNfHook body) {
    boolean result = nfHookService.sendNotification(body);
    return result ? "ok" : "maybe";
  }
}
