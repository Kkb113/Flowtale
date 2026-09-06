package com.sharefable.api.transport;

import com.sharefable.api.common.PublishedCss;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class PublishedCssTest {
  @Test void largeInlineAssetsDoNotOverflowTheRegexStack() {
    String css = ".public{background:url('data:image/png;base64," + "A".repeat(100000)
      + "')} .secret::before{content:'PRIVATE'}";
    String result = PublishedCss.redact(css, PublishedCss.protectedVariables(List.of(css)));
    assertFalse(result.contains("PRIVATE"));
    assertTrue(result.contains("A".repeat(100000)));
  }

  @Test void removesGeneratedStringsWithoutChangingLayoutOrQuotedDelimiters() {
    String css = "/* PRIVATE */.secret::before{color:red;content:'PRIVATE;}:x';width:20px}"
      + "@media(max-width:600px){.secret::after{c\\6f ntent: \"PRIVATE\";height:10px}}"
      + ".public{background:url('https://example.com/a;b.png');font-family:'Public font'}";
    String result = PublishedCss.redact(css, PublishedCss.protectedVariables(List.of(css)));
    assertFalse(result.contains("PRIVATE"));
    assertTrue(result.contains("color:red;"));
    assertTrue(result.contains("width:20px"));
    assertTrue(result.contains("height:10px"));
    assertTrue(result.contains("font-family:'Public font'"));
    assertTrue(result.contains("url('https://example.com/a;b.png')"));
    assertEquals(result, PublishedCss.redact(result, PublishedCss.protectedVariables(List.of(result))));
  }

  @Test void followsVariableChainsAcrossStylesheetsAndPreservesUnrelatedVariables() {
    var styles = List.of(".secret::before{content:var(--label, 'PRIVATE_FALLBACK')}",
      ":root{--label:var(--source);--source:'PRIVATE';--color:red}.public{color:var(--color)}");
    var variables = PublishedCss.protectedVariables(styles);
    assertTrue(variables.containsAll(List.of("--label", "--source")));
    String result = styles.stream().map(css -> PublishedCss.redact(css, variables)).reduce("", String::concat);
    assertFalse(result.contains("PRIVATE"));
    assertTrue(result.contains("--color:red"));
  }
}
