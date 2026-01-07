import React from "react";
import type { DatePickerProps } from "@/types/models";

export function DatePicker({
  value,
  maximumDate,
  onChange,
}: DatePickerProps) {
  return (
    <input
      type="date"
      value={value.toISOString().slice(0, 10)}
      max={maximumDate?.toISOString().slice(0, 10)}
      onChange={(e) => {
        onChange(e.target.value ? new Date(e.target.value) : null);
      }}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "16px",
      }}
    />
  );
}