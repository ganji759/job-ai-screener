"use client";

import { Provider } from "react-redux";
import { store } from "./index";

export const StoreProvider = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
