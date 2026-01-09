import React from "react";
import type { DatePickerProps } from "@/types/models";

export function DatePicker({
  value,
  maximumDate,
  onChange,
}: DatePickerProps) {
  // Helper to format Date → YYYY-MM-DD using local date components (no UTC shift)
  const formatLocalDate = (date: Date | null | undefined): string => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // When user picks a date, the input gives us YYYY-MM-DD string in local timezone
  // We reconstruct it safely at noon to prevent rollover
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const [year, month, day] = val.split("-").map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0, 0); // noon local
      onChange(date);
    } else {
      onChange(null);
    }
  };

  return (
    <input
      type="date"
      value={formatLocalDate(value)}
      max={formatLocalDate(maximumDate)}
      onChange={handleChange}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "16px",
      }}
    />
  );
}