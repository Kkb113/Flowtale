package com.sharefable.api.common;

import com.sharefable.api.entity.DemoEntity;

public interface FnTourBuilder {
  DemoEntity.DemoEntityBuilder<?, ?> apply(DemoEntity.DemoEntityBuilder<?, ?> builder);
}
