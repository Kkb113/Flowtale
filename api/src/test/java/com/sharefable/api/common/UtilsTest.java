package com.sharefable.api.common;

import com.sharefable.api.entity.EntityBase;
import com.sharefable.api.transport.resp.ResponseBase;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.SneakyThrows;
import lombok.ToString;
import lombok.experimental.SuperBuilder;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.Instant;

class UtilsTest {
  @SneakyThrows
  @Test
  void testEntityTransportConversion() {
    TestEntity100 testEntity100 = TestEntity100.builder()
      .id(1L)
      .rid("rid")
      .displayName("dn")
      .thumbnail("th")
      .t(TestEntity99.builder()
        .id(2L)
        .rid("rid2")
        .firstName("john")
        .build())
      .build();

    testEntity100.setUpdatedAt(Timestamp.from(Instant.now()));
    testEntity100.setCreatedAt(Timestamp.from(Instant.now()));

    TestResp100 responseBase = (TestResp100) Utils.fromEntityToTransportObject(testEntity100);

    Assertions.assertEquals("rid", responseBase.getRid());
    Assertions.assertInstanceOf(TestResp99.class, responseBase.getT());
    Assertions.assertEquals("rid2", responseBase.getT().getRid());
  }

  @Test
  void appendSuffixAfterFilename() {
    String s1 = Utils.appendSuffixAfterFilename(
      "https://example.com/path/test_img_3.png",
      "720"
    );
    Assertions.assertTrue(s1.endsWith("_720.png"));

    String s2 = Utils.appendSuffixAfterFilename(
      "https://example.com/path/test_img_3",
      "720"
    );
    Assertions.assertTrue(s2.endsWith("_720"));
  }

  @Data
  @EqualsAndHashCode(callSuper = true)
  @ToString(callSuper = true)
  @NoArgsConstructor
  @SuperBuilder(toBuilder = true)
  @TransportObjRef(cls = TestResp100.class)
  public static class TestEntity100 extends EntityBase {
    private String rid;
    private String displayName;
    private String thumbnail;
    private TestEntity99 t;
  }

  @Data
  @EqualsAndHashCode(callSuper = true)
  @ToString(callSuper = true)
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TestResp100 extends ResponseBase {
    private String rid;
    private String displayName;
    private String thumbnail;
    private TestResp99 t;
  }

  @Data
  @EqualsAndHashCode(callSuper = true)
  @ToString(callSuper = true)
  @NoArgsConstructor
  @SuperBuilder(toBuilder = true)
  @TransportObjRef(cls = TestResp99.class)
  public static class TestEntity99 extends EntityBase {
    private String rid;
    private String firstName;
  }

  @Data
  @EqualsAndHashCode(callSuper = true)
  @ToString(callSuper = true)
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TestResp99 extends ResponseBase {
    private String rid;
    private String firstName;
  }
}
