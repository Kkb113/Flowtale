package com.sharefable.api.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.entity.EntityBase;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.transport.resp.ResponseBase;
import jakarta.xml.bind.DatatypeConverter;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.javatuples.Pair;
import org.springframework.http.HttpHeaders;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public interface Utils {
  ObjectMapper objectMapper = new ObjectMapper();

  static String getShortRandomId() {
    return RandomStringUtils.random(16, "0123456789abcdefghijklmnopqrstuvwxyz");
  }

  static String formKeyFromObjectUrl(String url, int charLimit) {
    String path = url.replace("https://", "");
    int length = path.length();
    return StringUtils.substring(path, Math.max(0, length - charLimit), length);
  }

  static String appendSuffixAfterFilename(String urlStr, String suffix) {
    String[] urlSplit = urlStr.split("/");
    String fileName = urlSplit[urlSplit.length - 1];
    String[] fileNameSplit = fileName.split("\\.");
    if (fileNameSplit.length == 1) {
      // In case there are no extension then normalize by adding empty string so that the
      // loop iteration doesn't have to branch
      fileNameSplit = ArrayUtils.add(fileNameSplit, "");
    }
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < fileNameSplit.length; i++) {
      sb.append(fileNameSplit[i]);
      if (i == fileNameSplit.length - 2) {
        sb.append("_").append(suffix);
      }
      if (!fileNameSplit[i].isEmpty()) {
        sb.append(".");
      }
    }
    sb.deleteCharAt(sb.length() - 1); // delete the last dot
    String suffixedFileName = sb.toString();
    urlSplit[urlSplit.length - 1] = suffixedFileName;
    return StringUtils.join(urlSplit, "/");
  }

  static String createReadableId(String name) {
    String uuid = getShortRandomId();
    return StringUtils.appendIfMissing(
      StringUtils.substring(
        name
          .toLowerCase()
          .replaceAll("\\s+", "-")
          .replaceAll("[^\\w-]+", "")
          .replaceAll("-+", "-"),
        0, 22
      ),
      "-") + uuid;
  }

  static String createUuidWord() {
    return UUID.randomUUID().toString().replaceAll("-", "");
  }

  static Pair<byte[], ImageType> getImageDataFromBase64Str(String base64Data) {
    String[] dataSplit = base64Data.split(",");
    Pattern pattern = Pattern.compile("data:image/(.*?);base64", Pattern.CASE_INSENSITIVE);
    Matcher matcher = pattern.matcher(dataSplit[0]);
    ImageType imgType = ImageType.Unknown;
    if (matcher.find()) {
      imgType = ImageType.de(matcher.group(1));
    }
    return Pair.with(DatatypeConverter.parseBase64Binary(dataSplit[1]), imgType);
  }

  static String getterMethodNameFromFieldName(String fieldName) {
    return "get" + StringUtils.capitalize(fieldName);
  }

  static String setterMethodNameFromFieldName(String fieldName) {
    return "set" + StringUtils.capitalize(fieldName);
  }

  private static Field[] getAllFieldsForEntityClass(Class<?> cls) {
    boolean isEntityBase = EntityBase.class.isAssignableFrom(cls);
    if (!isEntityBase) {
      return new Field[]{};
    }
    Field[] declaredFields = cls.getDeclaredFields();
    return ArrayUtils.addAll(declaredFields, getAllFieldsForEntityClass(cls.getSuperclass()));
  }

  static <K extends EntityBase> ResponseBase fromEntityToTransportObject(K entity)
    throws NoSuchMethodException, InvocationTargetException, InstantiationException, IllegalAccessException {
    TransportObjRef objRefAnnotation = entity.getClass().getAnnotation(TransportObjRef.class);
    if (objRefAnnotation == null) {
      throw new RuntimeException("An entity must be associated with corresponding transport object. Entity: " + entity.getClass());
    }
    Class<? extends ResponseBase> transportCls = objRefAnnotation.cls();
    ResponseBase transportObj = transportCls.getDeclaredConstructor().newInstance();

    Field[] allFieldsForEntityClass = getAllFieldsForEntityClass(entity.getClass());
    for (Field f : allFieldsForEntityClass) {
      boolean isEntityBase = EntityBase.class.isAssignableFrom(f.getType());
      try {
        Method getterFromEntity = entity.getClass().getMethod(getterMethodNameFromFieldName(f.getName()));
        Object valueFromEntity = getterFromEntity.invoke(entity);
        Class<?> type = f.getType();

        if (isEntityBase) {
          valueFromEntity = fromEntityToTransportObject((EntityBase) valueFromEntity);
          type = type.getAnnotation(TransportObjRef.class).cls();
        }

        Method setterFromTransport = transportCls.getMethod(setterMethodNameFromFieldName(f.getName()), type);
        setterFromTransport.invoke(transportObj, valueFromEntity);
      } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException e) { /* noop */}
    }

    return transportObj;
  }

  static String normalizeWhitespace(String str) {
    return str.trim().replaceAll("\\s+", " ");
  }

  static boolean compareDisplayName(String oldName, String newName) {
    return oldName != null && newName != null &&
      normalizeWhitespace(oldName).equalsIgnoreCase(normalizeWhitespace(newName));
  }

  static boolean isParentScreen(Screen screen) {
    return screen.getParentScreenId() == 0;
  }

  @SafeVarargs
  static <T> List<T> runInParallel(Callable<T>... callables) throws Exception {
    List<Callable<T>> list = Arrays.asList(callables);
    int noOfThread = Math.min(list.size(), Runtime.getRuntime().availableProcessors());
    ExecutorService execService = Executors.newFixedThreadPool(noOfThread);

    try {
      List<Future<T>> futures = execService.invokeAll(list);
      return futures.stream().map(f -> {
        try {
          return f.get();
        } catch (InterruptedException | ExecutionException e) {
          throw new RuntimeException(e);
        }
      }).collect(Collectors.toList());
    } finally {
      execService.shutdown();
    }
  }

  static Timestamp getCurrentUtcTimestamp() {
    return Timestamp.from(Instant.now());
  }

  static URL convertRelativeUrlToAbsoluteUrlIfRequired(String url, URL origin) throws URISyntaxException, MalformedURLException {
    URI uri = new URI(url);
    if (uri.isAbsolute()) {
      return uri.toURL();
    } else {
      return new URL(origin, url);
    }
  }

  static String getContentTypeFromHeader(HttpHeaders headers) {
    List<String> contentTypes = headers.get(HttpHeaders.CONTENT_TYPE);
    return contentTypes == null ? "" : String.join(",", contentTypes);
  }

  static String getContentEncodingFromHeader(HttpHeaders headers) {
    List<String> contentEncodings = headers.get(HttpHeaders.CONTENT_ENCODING);
    return contentEncodings == null ? "" : String.join(",", contentEncodings);
  }

  static boolean isUrlPresentInIgnoreList(URL nestedParsedOrigin, String[] ignoreList) {
    for (String host : ignoreList) {
      if (host.equalsIgnoreCase(nestedParsedOrigin.getHost())) {
        return true;
      }
    }
    return false;
  }

  static String getDomainFromEmail(String email) {
    Pattern pattern = Pattern.compile("@(\\S+)");
    Matcher matcher = pattern.matcher(email);
    if (matcher.find()) {
      return matcher.group(1);
    }
    return "";
  }

  static Pair<String, Boolean> getDomainFromEmailForRespectiveEmail(String email) {
    String domain = getDomainFromEmail(email);
    if (ExcludeEmailDomain.NOT_ALLOWED.contains(domain)) {
      domain = email.replaceAll("\\W", "").toLowerCase();
      if (domain.length() > 250) domain = domain.substring(0, 250);
      return Pair.with(domain + ".com", false);
    }
    return Pair.with(domain, true);
  }

  static String calculateParticularUtcDateFromCurrentUtc(Integer numberOfDays) {
    Instant currentUTC = Instant.now();
    Instant specificDateFromCurrentUTC = currentUTC.minus(java.time.Period.ofDays(numberOfDays));
    LocalDateTime particularUTCLocalDateTime = LocalDateTime.ofInstant(specificDateFromCurrentUTC, ZoneId.of("UTC"));
    String particularDate = particularUTCLocalDateTime.toLocalDate().toString();
    return particularDate.replace("-", "");
  }

  static Map<String, String> generateMsgPayload(String eventName, Map<String, String> payload) {
    Map<String, String> msg = new HashMap<>();
    msg.put("eventName", eventName);
    Map<String, String> msgPayload = objectMapper.convertValue(payload, Map.class);
    for (Map.Entry<String, String> entry : msgPayload.entrySet()) {
      msg.put("payload_" + entry.getKey(), entry.getValue());
    }
    return msg;
  }

}
