import React from "react";
import { View, Platform } from "react-native";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import type { DatePickerProps } from "@/types/models";
import { useTheme } from "@/contexts/ThemeContext";

export function DatePicker({
  value,
  maximumDate,
  onChange,
}: DatePickerProps) {
  const { theme } = useTheme();
  return (
  <View
    style={{
      width: '100%',                    
      alignItems: 'center',             
      justifyContent: 'center',        
      backgroundColor: theme.primary + 60,        
      borderRadius: 16,    
      overflow: 'visible',             
      padding: 8,                       
      marginVertical: 0       
    }}
  >
    <RNDateTimePicker
      value={value}
      maximumDate={maximumDate}
      mode="date"
      display={Platform.OS === "ios" ? "compact" : "default"}
      onChange={(_, selectedDate) => {
        if (selectedDate) {
          const normalizedDate = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            12,
            0,
            0,
            0
          );
          onChange(normalizedDate);
        }
      }}
      textColor={theme.text}            
      style={{                        
        alignSelf: 'center',
        left: -12,          
        width: 300,                    
      }}
    />
  </View>
);
}