package com.sharefable.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.EntityConfigKV;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TourWithConfig {
  private DemoEntity demoEntity;
  private EntityConfigKV entityConfigKV;
}
