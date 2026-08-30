package com.sharefable.api.common;

import com.sharefable.api.entity.Screen;

public interface FnScreenBuilder {
    Screen.ScreenBuilder<?, ?> apply(Screen.ScreenBuilder<?, ?> builder);
}
