package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
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
public class TourAnnWithViews {
    private String annId;
    private Long totalViews;
    private Double p50;
    private Double p75;
    private Double p95;
}
