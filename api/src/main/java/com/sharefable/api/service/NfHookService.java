package com.sharefable.api.service;

import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.NfEvents;
import com.sharefable.api.transport.req.ReqNfHook;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Map;

@Service
@Slf4j
public class NfHookService {
  private static final HashSet<NfEvents> ALLOWED_EVENTS = new HashSet<>();

  static {
    ALLOWED_EVENTS.add(NfEvents.EBOOK_DOWNLOAD);
    ALLOWED_EVENTS.add(NfEvents.NEW_USER_SIGNUP);
    ALLOWED_EVENTS.add(NfEvents.NEW_ORG_CREATED);
    ALLOWED_EVENTS.add(NfEvents.RUN_INTEGRATION);
    ALLOWED_EVENTS.add(NfEvents.NEW_USER_SIGNUP_WITH_SUBS);
  }

  private final QMsgService qMsgService;

  @Autowired
  public NfHookService(QMsgService qMsgService) {
    this.qMsgService = qMsgService;
  }

  public boolean sendNotification(ReqNfHook body) {
    return sendNotification(body.eventName(), body.payload());
  }

  public boolean sendNotification(NfEvents eventName, Map<String, String> payload) {
    if (!ALLOWED_EVENTS.contains(eventName)) {
      log.warn("{} is sent for notification, but is discarded as ALLOWED_EVENTS does not contain the event", payload);
      return false;
    }

    Map<String, String> msg = Utils.generateMsgPayload(eventName.toString(), payload);
    qMsgService.sendSqsMessage("NF", msg);
    return true;
  }
}
