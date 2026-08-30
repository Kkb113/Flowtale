package com.sharefable.api.transport.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class LinkedAppVersion {
    private String _v;
    private String description;
}
