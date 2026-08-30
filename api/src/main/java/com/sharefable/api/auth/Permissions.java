package com.sharefable.api.auth;

import org.springframework.stereotype.Component;

@Component("Perm")
public class Permissions {
    public static final String READ_SCREEN = "read:screen";
    public static final String READ_TOUR = "read:tour";
    public static final String WRITE_SCREEN = "write:screen";
    public static final String WRITE_TOUR = "write:tour";
    public static final String VIEW_ANALYTICS = "view:analytics";
}
