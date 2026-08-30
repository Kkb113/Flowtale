package com.sharefable.api.transport.resp;

import com.sharefable.api.transport.GenerateTSDef;
import lombok.Data;

@GenerateTSDef
@Data
public class RespSubsValidation {
  private boolean isCardPresent;
}
