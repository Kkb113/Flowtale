package com.sharefable.api.controller.v1.vendor;

import com.sharefable.Routes;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class EmbedlyController {


  @RequestMapping(value = Routes.EMBEDLY_EMBED, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, String> getToken(@RequestParam("url") String url, @RequestParam("format") String format) {
    if (!StringUtils.equalsIgnoreCase(format, "json"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "format must be json");


    URL pUrl;
    String decodedUrl;
    try {
      decodedUrl = URLDecoder.decode(url, StandardCharsets.UTF_8);
      pUrl = new URL(decodedUrl);
    } catch (MalformedURLException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, url + " is not valid URL");
    }

    String[] pathArr = StringUtils.split(pUrl.getPath(), "/");
    String demoId = pathArr[pathArr.length - 1];
    String html = String.format("""
         <iframe
         src="https://app.sharefable.com/embed/demo/%s"
         style="border: 1px solid rgba(0, 0, 0, 0.1); min-height: 360px; min-width: 480px; width: 100%%; height:100%%"
       />
      """, demoId);

    return Map.of(
      "type", "rich",
      "provider_name", "Fable",
      "provider_url", "https://sharefable.com/",
      "url", decodedUrl,
      "html", html
    );
  }
}
