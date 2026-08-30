package com.sharefable.api.transport.req;


import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@GenerateTSDef
public class ReqMediaProcessing {
  private String path;
  private String cdnPath;
  private ReqEntityAssetAssn assn;
}
