import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { space } from '@nano/design-tokens';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from '../components';
import { clinicDateTime } from '../i18n/format';

/**
 * Native date + time choice (WAL-09 "Send on", WAL-04 "Change send time"): iOS inline compact picker, Android the
 * system date dialog then the time dialog. Shown in the clinic's time zone label; the device picks local time.
 */
export function SendTimePicker({ label, value, onChange, zone }: { label: string; value: Date; onChange: (d: Date) => void; zone: string }) {
  const [minimum] = useState(() => new Date(Date.now() + 5 * 60_000));
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.row}>
        <Text variant="label" style={styles.flex}>
          {label}
        </Text>
        <DateTimePicker
          value={value}
          mode="datetime"
          display="compact"
          minimumDate={minimum}
          accessibilityLabel={label}
          onChange={(_event, d) => d && onChange(d)}
        />
      </View>
    );
  }
  const pick = () =>
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate: minimum,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (e, time) => {
            if (e.type === 'set' && time) onChange(time);
          },
        });
      },
    });
  return (
    <View style={styles.group}>
      <Text variant="label">{label}</Text>
      <Button variant="secondary" icon="calendar-blank" onPress={pick}>
        {clinicDateTime(value.toISOString(), zone)}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  group: { gap: space['2'] },
});
