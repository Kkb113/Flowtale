package com.sharefable.api.service;

import com.amazonaws.services.kinesisfirehose.AmazonKinesisFirehoseClient;
import com.amazonaws.services.kinesisfirehose.model.PutRecordRequest;
import com.amazonaws.services.kinesisfirehose.model.Record;
import com.sharefable.api.config.FirehoseConfig;
import io.sentry.Sentry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;

@Service
@Slf4j
@RequiredArgsConstructor
public class FirehoseService {
  private final AmazonKinesisFirehoseClient firehoseClient;
  private final FirehoseConfig firehoseConfig;


  public void sendEventsToFirehose(String prefix, String sub, String userEventLogs) {
    String streamName = "";
    try {
      PutRecordRequest putRecordRequest = new PutRecordRequest();
      streamName = prefix + sub;
      log.info("[{}] {}", streamName, userEventLogs);
      putRecordRequest.setDeliveryStreamName(streamName);
      Record record = new Record().withData(ByteBuffer.wrap(userEventLogs.getBytes()));
      putRecordRequest.setRecord(record);
      firehoseClient.putRecord(putRecordRequest);
    } catch (Exception e) {
      log.error("Something wrong while sending data to firehose stream {}", streamName, e);
      Sentry.captureException(e);
    }
  }

  public void sendEventsToFirehose(String sub, String userEventLogs) {
    sendEventsToFirehose(firehoseConfig.getStreamPrefix(), sub, userEventLogs);
  }
}
