import React from "react";

interface ICtx {}

export const RootContext = React.createContext<ICtx>({} as ICtx);
