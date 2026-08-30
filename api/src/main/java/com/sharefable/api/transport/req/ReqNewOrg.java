package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.ObjectValidationResult;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;

import static com.sharefable.api.common.Utils.normalizeWhitespace;

@Slf4j
@GenerateTSDef
public record ReqNewOrg(String displayName, String thumbnail) {
    public ReqNewOrg normalizeDisplayName() {
        return new ReqNewOrg(normalizeWhitespace(displayName()), thumbnail);
    }

    public ObjectValidationResult validate() {
        boolean isValid = true;
        List<String> msgs = new ArrayList<>();
        if (StringUtils.isBlank(displayName())) {
            isValid = false;
            String msg = "Org name can't be empty";
            log.error(msg);
            msgs.add(msg);
        }

        return new ObjectValidationResult(isValid, msgs);
    }
}
