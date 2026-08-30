package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.EntityConfigKV;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespDemoEntityWithSubEntities extends RespDemoEntity {
  private List<RespScreen> screens;
  private Optional<Map<String, String>> idxm;
  private RespCommonConfig cc;

  public static RespDemoEntityWithSubEntities from(DemoEntity demoEntity, List<EntityConfigKV> entityConfigKV) {
    RespDemoEntityWithSubEntities resp = (RespDemoEntityWithSubEntities) RespDemoEntity.from(demoEntity, entityConfigKV);
    // `fromEntityToTransportObject` can't convert collection<type> to collection<resp_type>
    // hence this explicit conversion is necessary
    // Also although screen <-> tour is saved as many-many relationship in db / jpa, it's
    // logically stored as many-one relationship
    if (demoEntity.getEntityType() == TopLevelEntityType.DEMO_HUB) return resp;
    if (demoEntity.getScreens() == null) {
      resp.setScreens(List.of());
    } else {
      resp.setScreens(demoEntity.getScreens().stream().map(RespScreen::from).toList());
    }
    return resp;
  }

  public static RespDemoEntityWithSubEntities from(DemoEntity demoEntity, RespCommonConfig cc, List<EntityConfigKV> entityConfigKV) {
    RespDemoEntityWithSubEntities resp = from(demoEntity, entityConfigKV);
    resp.setCc(cc);
    return resp;
  }

  private static RespDemoEntityWithSubEntities Empty() {
    return new RespDemoEntityWithSubEntities();
  }
}
