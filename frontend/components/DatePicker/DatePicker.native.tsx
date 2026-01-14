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
        onChange={(_, selectedDate) => {
          // Android fires with undefined when user cancels
          if (selectedDate) {
            // Normalize to noon local time to avoid timezone offset rollover
            const normalizedDate = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate(),
              12, // noon — prevents DST/timezone edge cases
              0,
              0,
              0
            );
            onChange(normalizedDate);
          }
        }}
      />
    </View>
  );
}