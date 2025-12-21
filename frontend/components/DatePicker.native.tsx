import React from "react";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
};

export function DatePicker({ value, onChange, maximumDate }: Props) {
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display={Platform.OS === "ios" ? "spinner" : "default"}
      maximumDate={maximumDate}
      onChange={(event, selectedDate) => {
        if (event.type === "set" && selectedDate) onChange(selectedDate);
      }}
    />
  );
}
