package com.sharefable.api.common;

import com.sharefable.api.transport.resp.ResponseBase;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface TransportObjRef {
  Class<? extends ResponseBase> cls();
}
