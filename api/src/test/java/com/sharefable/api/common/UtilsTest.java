package com.sharefable.api.common;

import com.chargebee.Environment;
import com.chargebee.Result;
import com.chargebee.models.Customer;
import com.chargebee.models.Subscription;
import com.sharefable.api.entity.EntityBase;
import com.sharefable.api.transport.resp.ResponseBase;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;

class UtilsTest {
  /*


  64955372
  akash00goswami@gmail.com
  3865e634074d43e64d77d878a2931af6c1f91a120922cdf69563d9a533454f15
   */
  @Test
  void test69() throws NoSuchAlgorithmException {
    String shortRid = StringUtils.substring("hell-2345", 0, 5).replace("-", "");
    System.out.println(shortRid);
//    String text = StringUtils.join(List.of(
//      "<client_secret>",
//      "GET",
//      "https://62e8-122-171-22-212.ngrok-free.app/v1/vr/hs/dfu?userId=64955372&userEmail=akash00goswami@gmail.com&associatedObjectId=5283919377&associatedObjectType=CONTACT&portalId=45540659&email=akash@acme.com"
//    ), "");
//    System.out.println("text " + text);
////    MessageDigest digest = MessageDigest.getInstance("SHA-256");
////    byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
//    System.out.println("hash " + DigestUtils.sha256Hex(text));
  }

  @Test
  void test() {
    try {
//            Result result = HostedPage
//                .checkoutNewForItems()
//                .subscriptionItemItemPriceId(0, "business-USD-Monthly")
//                .subscriptionItemQuantity(0, 1)
//                .customerFirstName("TestFN")
//                .customerLastName("LastFN")
//                .customerCompany("TestOrg")
//                .customerEmail("akash@sharefable.com")
//                .request(new Environment("fable-test", "test_PVyQEHcqmvLv3FT3Nw6AY7P94qkL0FAw"));
//
//            HostedPage hostedPage = result.hostedPage();
//            System.out.println(hostedPage.toJson());


      /*
       * Create a customer
       */
//            Result result = Customer.create()
//                .firstName("Test")
//                .lastName("User")
//                .email("testuser@fableacme.com")
//                .locale("fr-CA")
//                .request(new Environment("fable-test", "test_PVyQEHcqmvLv3FT3Nw6AY7P94qkL0FAw"));
//            Customer customer = result.customer();
//            System.out.println(customer.toJson());


      String id = "169ltnTo2iKtI6prq";

      /*
       * Update customer
       */
//            Result result = Customer.update(id)
//                .firstName("Test2")
//                .lastName("User2")
//                .email("test2user2@fableacme.com")
//                .company("fableacme")
//                .request(new Environment("fable-test", "test_PVyQEHcqmvLv3FT3Nw6AY7P94qkL0FAw"));
//            Customer customer = result.customer();
//            System.out.println(customer.toJson());



      /*
       * Create subscription for customer
       */

      Result result = Subscription.createWithItems(id)
        .subscriptionItemItemPriceId(0, "business-USD-Monthly")
        .subscriptionItemQuantity(0, 3)
        .request(new Environment("fable-test", "test_PVyQEHcqmvLv3FT3Nw6AY7P94qkL0FAw"));

      Subscription subscription = result.subscription();
      Customer customer = result.customer();
      System.out.println(">>>> subscription <<<");
      System.out.println(subscription.toJson());
      System.out.println(">>>> customer <<<");
      System.out.println(customer.toJson());


//            Result request = Subscription.retrieve("Azz5iETo19aDu5xAU")
//                .request(new Environment("fable-test", "test_PVyQEHcqmvLv3FT3Nw6AY7P94qkL0FAw"));
//
//            System.out.println(request.jsonResponse().toString(2));
    } catch (Exception e) {
      e.printStackTrace();
      throw new RuntimeException(e);
    }


//        String readableId = Utils.createReadableId("Inbox (23) - hustleag6969@gmail.com - Gmail");
//        System.out.println(readableId);
  }

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
      "https://fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/akashgoswami/job_test/test_img_3.png",
      "720"
    );
    Assertions.assertTrue(s1.endsWith("_720.png"));

    String s2 = Utils.appendSuffixAfterFilename(
      "https://fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/akashgoswami/job_test/test_img_3",
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
