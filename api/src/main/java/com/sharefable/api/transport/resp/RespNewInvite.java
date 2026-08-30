package com.sharefable.api.transport.resp;

import com.sharefable.api.transport.GenerateTSDef;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@ToString
@SuperBuilder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@GenerateTSDef
public class RespNewInvite {
  private String code;

  public static RespNewInvite Empty() {
    return new RespNewInvite();
  }
}
