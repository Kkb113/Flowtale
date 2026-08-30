package com.sharefable.api.service.vendor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.config.vendor.SlackConfig;
import com.slack.api.Slack;
import com.slack.api.webhook.Payload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

import static com.slack.api.model.block.Blocks.asBlocks;
import static com.slack.api.model.block.Blocks.section;
import static com.slack.api.model.block.composition.BlockCompositions.markdownText;

@Service
@Slf4j
public class SlackMsgService {
  private final ObjectMapper mapper = new ObjectMapper();
  private final Slack client = Slack.getInstance();
  private final SlackConfig slackConfig;

  public SlackMsgService(SlackConfig slackConfig) {
    this.slackConfig = slackConfig;
  }

  @Async
  public void sendAppSumoSubsMsgs(Map<String, Object> data) throws IOException {
    String jsonStr = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(data);
    Payload payload = Payload.builder()
      .blocks(asBlocks(
        section(s -> s.text(markdownText(String.format("```%s```", jsonStr))))
      )).build();
    send(slackConfig.getAppsumoSubsWebhookUrl(), "SLACK_APPSUMO_SUBS_WEBHOOK_URL", payload);
  }

  @Async
  public void sendCustomDomainReq(
    Long orgId,
    String email,
    Long configId,
    String action,
    String reason,
    Object customDomain
  ) throws IOException {
    String jsonStr = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of(
      "type", "CUSTOM_DOMAIN",
      "orgId", orgId,
      "requester_email", email,
      "EntityConfigKvId", configId,
      "action", action,
      "reason", reason,
      "customDomain", customDomain
    ));
    Payload payload = Payload.builder()
      .blocks(asBlocks(
        section(s -> s.text(markdownText(String.format("```%s```", jsonStr))))
      )).build();
    send(slackConfig.getEngOpsReqWebhookUrl(), "SLACK_ENG_OPS_REQ_WEBHOOK_URL", payload);
  }

  private void send(String webhookUrl, String environmentVariable, Payload payload) throws IOException {
    if (webhookUrl == null || webhookUrl.isBlank()) {
      log.warn("Skipping Slack notification because {} is not configured", environmentVariable);
      return;
    }
    client.send(webhookUrl, payload);
  }
}
