package com.sharefable.analytics.transport;

import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@GenerateTSDef
public class ReqActivityLog {
  private List<InActivityLog> logs;
}
