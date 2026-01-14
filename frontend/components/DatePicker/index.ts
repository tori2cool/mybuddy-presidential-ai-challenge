import { Platform } from "react-native";

type DatePickerType = typeof import("./DatePicker.native").DatePicker;

// Lazy require so native doesn't even evaluate the web module (and vice versa)
const DatePicker: DatePickerType =
  Platform.OS === "web"
    ? (require("./DatePicker.web").DatePicker as DatePickerType)
    : (require("./DatePicker.native").DatePicker as DatePickerType);

export { DatePicker };