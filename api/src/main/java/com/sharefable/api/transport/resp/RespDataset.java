package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.Dataset;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespDataset {
  private Dataset dataset;
  private Long owner;
  @OptionalPropInTS
  private RespUploadUrl presignedUrl;

  public static RespDataset from(Dataset dataset, Long orgId) {
    RespDataset resp = new RespDataset();
    resp.setDataset(dataset);
    resp.setOwner(orgId);
    return resp;
  }

  public static RespDataset from(Dataset dataset, RespUploadUrl url, Long orgId) {
    RespDataset resp = from(dataset, orgId);
    resp.setPresignedUrl(url);
    return resp;
  }
}
