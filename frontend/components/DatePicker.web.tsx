import React, { useEffect, useState } from "react";
import { TextInput, View } from "react-native";

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
  // optional styling hooks if you want
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYMD(text: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);

  const dt = new Date(y, mo, da);
  if (Number.isNaN(dt.getTime())) return null;

  // Guard against JS date rollover (e.g. 2025-02-31 -> Mar 3)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== da
  ) {
    return null;
  }

  return dt;
}

export function DatePicker({
  value,
  onChange,
  maximumDate,
  textColor = "#fff",
  bgColor = "#111827",
  borderColor = "#374151",
}: Props) {
  const [text, setText] = useState(toYMD(value));

  // keep input in sync if parent changes the date
  useEffect(() => {
    setText(toYMD(value));
  }, [value]);

  return (
    <View>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);

          const dt = parseYMD(t);
          if (!dt) return;

          if (maximumDate && dt > maximumDate) return;

          onChange(dt);
        }}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          height: 48,
          paddingHorizontal: 12,
          borderWidth: 2,
          borderRadius: 10,
          color: textColor,
          backgroundColor: bgColor,
          borderColor,
        }}
      />
    </View>
  );
}
