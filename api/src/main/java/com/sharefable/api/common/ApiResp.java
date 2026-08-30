package com.sharefable.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class ApiResp<T> {
    private ResponseStatus status;
    private T data;
    private String errStr;
    private ErrorCode errCode;

    public enum ResponseStatus {Success, Failure}

    public enum ErrorCode {
        IllegalArgs(100),
        NotFound(101);

        public final int code;

        ErrorCode(int code) {
            this.code = code;
        }

        @JsonValue
        public int toValue() {
            return this.code;
        }
    }
}
