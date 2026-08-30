package com.sharefable.api.transport.req;

import com.sharefable.api.transport.EntityType;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@GenerateTSDef
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReqEntityAssetAssn {
    private String entityRid;

    private EntityType entityType;
}
