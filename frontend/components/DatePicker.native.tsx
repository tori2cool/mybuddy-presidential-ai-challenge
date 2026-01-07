import React from "react";
import { View, Platform } from "react-native";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import type { DatePickerProps } from "@/types/models";

export function DatePicker({
  value,
  maximumDate,
  onChange,
}: DatePickerProps) {
  return (
    <View>
      <RNDateTimePicker
        value={value}
        maximumDate={maximumDate}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(_, date) => {
          // Android fires with undefined on cancel
          if (date) {
            onChange(date);
          }
        }}
      />
    </View>
  );
}