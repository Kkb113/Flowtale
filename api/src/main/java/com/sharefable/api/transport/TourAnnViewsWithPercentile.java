package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@SuperBuilder(toBuilder = true)
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
public class TourAnnViewsWithPercentile {
    private String annId;
    private Long totalViews;
    private Double p1;
    private Double p5;
    private Double p10;
    private Double p25;
    private Double p50;
    private Double p75;
    private Double p90;
    private Double p95;
    private Double p99;
}
