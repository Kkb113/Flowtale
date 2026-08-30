package com.sharefable.api.transport.resp;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@SuperBuilder(toBuilder = true)
public abstract class ResponseBase {
    public Timestamp createdAt;
    public Timestamp updatedAt;
}
