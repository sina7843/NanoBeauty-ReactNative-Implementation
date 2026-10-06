import { Platform, type TextInputProps } from 'react-native';

/**
 * One-time-code autofill (guideline 08): iOS `oneTimeCode` (Messages suggestion), Android `sms-otp`
 * (SMS Retriever autofill). Spread onto the OTP TextInput built in NANO-02.
 */
export const otpInputProps: TextInputProps = {
  keyboardType: 'number-pad',
  inputMode: 'numeric',
  textContentType: 'oneTimeCode',
  autoComplete: Platform.OS === 'android' ? 'sms-otp' : 'one-time-code',
};

/** Phone number entry (identity, A6). */
export const phoneInputProps: TextInputProps = {
  keyboardType: 'phone-pad',
  inputMode: 'tel',
  textContentType: 'telephoneNumber',
  autoComplete: 'tel',
};
