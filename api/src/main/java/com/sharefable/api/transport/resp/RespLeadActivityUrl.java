package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@SuperBuilder(toBuilder = true)
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RespLeadActivityUrl {
    private String leadActivityUrl = "";

    public static RespLeadActivityUrl Empty() {
        return new RespLeadActivityUrl();
    }
}
