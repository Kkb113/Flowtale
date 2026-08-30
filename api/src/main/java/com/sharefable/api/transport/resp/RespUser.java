package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.Utils;
import com.sharefable.api.entity.User;
import com.sharefable.api.transport.GenerateTSDef;
import io.sentry.Sentry;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespUser extends ResponseBase {
  private Long id;
  private String firstName;
  private String lastName;
  private String email;
  private String avatar;
  private Boolean personalEmail;
  private UserOrgAssociation orgAssociation;
  private Boolean active;
  private List<RespOrg> orgs;

  public static RespUser from(User user) {
    try {
      RespUser respUser = (RespUser) Utils.fromEntityToTransportObject(user);
      respUser.setPersonalEmail(user.getDomainBlacklisted());
      respUser.setOrgs(user.getOrgs() != null ? user.getOrgs().stream().map(RespOrg::from).toList() : List.of());
      return respUser;
    } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
             InvocationTargetException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return Empty();
    }
  }

  public static RespUser Empty() {
    return new RespUser();
  }

  public enum UserOrgAssociation {
    Implicit,
    Explicit,
    NA
  }
}
