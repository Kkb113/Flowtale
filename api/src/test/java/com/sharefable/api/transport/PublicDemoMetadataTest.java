package com.sharefable.api.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sharefable.api.common.PublicDemoMetadata;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PublicDemoMetadataTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test void publicationExcludesAccountDataAndAiInputsWithoutMutatingTheDraft() throws Exception {
    ObjectNode draft = (ObjectNode) mapper.readTree("""
      {"status":"Success","debug":"private","data":{"rid":"demo","owner":12,
       "createdBy":{"email":"private@example.invalid","orgs":[{"id":99}]},"internalFutureField":"private",
       "settings":{"primaryKey":"email"},"datasets":[],"cc":{"screenAssetPath":"https://assets.invalid/"},
       "info":{"thumbnail":"thumb","frameSettings":"LIGHT","isVideo":false,"locked":true,"threadId":"private",
               "annDemoId":"private","productDetails":"private","demoObjective":"private","demoRouter":{},
               "futurePrivateInput":"private"},
       "screens":[{"id":1,"rid":"screen","type":1,"assetPrefixHash":"asset","url":"https://example.com/",
                   "createdBy":{"email":"other@example.invalid"},"uploadUrl":"https://signed.invalid/secret",
                   "futurePrivateField":"private"}]}}
      """);
    ObjectNode original = draft.deepCopy();
    ObjectNode published = PublicDemoMetadata.project(draft);
    assertEquals(original, draft);
    assertFalse(published.toString().contains("private"));
    assertFalse(published.toString().contains("signed.invalid"));
    assertEquals("demo", published.path("data").path("rid").asText());
    assertEquals(12, published.path("data").path("owner").asInt());
    assertEquals("email", published.path("data").path("settings").path("primaryKey").asText());
    assertEquals("thumb", published.path("data").path("info").path("thumbnail").asText());
    assertTrue(published.path("data").path("info").path("locked").asBoolean());
    assertEquals("asset", published.path("data").path("screens").get(0).path("assetPrefixHash").asText());
  }

  @Test void malformedPublicationFailsClosed() throws Exception {
    for (String json : new String[] {"{}", "{\"data\":null}", "{\"data\":{\"screens\":{}}}",
        "{\"data\":{\"screens\":[null]}}"}) {
      ObjectNode input = (ObjectNode) mapper.readTree(json);
      assertThrows(IllegalArgumentException.class, () -> PublicDemoMetadata.project(input));
    }
  }
}
